/* Arcade Watch · puente entre Java (JsEngine.java) y QuickJS.
   Un motor = un JSRuntime + un JSContext. Todo se llama desde el mismo hilo (el hilo de la interfaz de Android).
   Funciones que el JS puede llamar (las implementa Java a través de JsEngine.Host):
     __measure(texto, fuente) → ancho   __hasGlyph(texto) → bool   __storeGet(clave) → texto|null
     __storeSet(clave, valor|null)      __log(texto)
   Las cadenas se pasan siempre como UTF-16 en Java y UTF-8 en QuickJS (con los emojis bien convertidos). */
#include <jni.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <time.h>
#include "quickjs.h"

typedef struct {
    JSRuntime *rt;
    JSContext *ctx;
    JNIEnv *env;          /* el de la llamada en curso */
    jobject host;         /* referencia global al JsEngine.Host */
    jmethodID mMeasure, mHasGlyph, mStoreGet, mStoreSet, mLog;
    double deadline;      /* para cortar bucles infinitos (segundos de reloj monotónico) */
} Engine;

static double now_s(void) { struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts); return ts.tv_sec + ts.tv_nsec / 1e9; }

/* ---------- UTF-8 (QuickJS) ⇄ UTF-16 (Java) ---------- */
static jstring utf8_to_jstring(JNIEnv *env, const char *s, size_t len) {
    jchar stackbuf[256], *out = len < 256 ? stackbuf : (jchar *)malloc(sizeof(jchar) * (len + 1));
    size_t n = 0, i = 0;
    const unsigned char *p = (const unsigned char *)s;
    while (i < len) {
        uint32_t c = p[i];
        if (c < 0x80) { i++; }
        else if ((c & 0xE0) == 0xC0 && i + 1 < len) { c = ((c & 0x1F) << 6) | (p[i + 1] & 0x3F); i += 2; }
        else if ((c & 0xF0) == 0xE0 && i + 2 < len) { c = ((c & 0x0F) << 12) | ((p[i + 1] & 0x3F) << 6) | (p[i + 2] & 0x3F); i += 3; }
        else if ((c & 0xF8) == 0xF0 && i + 3 < len) { c = ((c & 0x07) << 18) | ((p[i + 1] & 0x3F) << 12) | ((p[i + 2] & 0x3F) << 6) | (p[i + 3] & 0x3F); i += 4; }
        else { c = 0xFFFD; i++; }
        if (c >= 0x10000) { c -= 0x10000; out[n++] = (jchar)(0xD800 + (c >> 10)); out[n++] = (jchar)(0xDC00 + (c & 0x3FF)); }
        else out[n++] = (jchar)c;
    }
    jstring r = (*env)->NewString(env, out, (jsize)n);
    if (out != stackbuf) free(out);
    return r;
}
static jstring js_to_jstring(JNIEnv *env, JSContext *ctx, JSValueConst v) {
    size_t len; const char *s = JS_ToCStringLen(ctx, &len, v);
    if (!s) return NULL;
    jstring r = utf8_to_jstring(env, s, len);
    JS_FreeCString(ctx, s);
    return r;
}
/* devuelve un búfer UTF-8 nuevo (hay que liberarlo con free) */
static char *jstring_to_utf8(JNIEnv *env, jstring js, size_t *plen) {
    if (!js) { *plen = 0; return NULL; }
    jsize n = (*env)->GetStringLength(env, js);
    const jchar *u = (*env)->GetStringChars(env, js, NULL);
    char *out = (char *)malloc((size_t)n * 3 + 1);
    size_t k = 0;
    for (jsize i = 0; i < n; i++) {
        uint32_t c = u[i];
        if (c >= 0xD800 && c < 0xDC00 && i + 1 < n && u[i + 1] >= 0xDC00 && u[i + 1] < 0xE000) { c = 0x10000 + ((c - 0xD800) << 10) + (u[i + 1] - 0xDC00); i++; }
        if (c < 0x80) out[k++] = (char)c;
        else if (c < 0x800) { out[k++] = (char)(0xC0 | (c >> 6)); out[k++] = (char)(0x80 | (c & 0x3F)); }
        else if (c < 0x10000) { out[k++] = (char)(0xE0 | (c >> 12)); out[k++] = (char)(0x80 | ((c >> 6) & 0x3F)); out[k++] = (char)(0x80 | (c & 0x3F)); }
        else { out[k++] = (char)(0xF0 | (c >> 18)); out[k++] = (char)(0x80 | ((c >> 12) & 0x3F)); out[k++] = (char)(0x80 | ((c >> 6) & 0x3F)); out[k++] = (char)(0x80 | (c & 0x3F)); }
    }
    out[k] = 0;
    (*env)->ReleaseStringChars(env, js, u);
    *plen = k;
    return out;
}
static JSValue jstring_to_js(JNIEnv *env, JSContext *ctx, jstring js) {
    if (!js) return JS_NULL;
    size_t len; char *s = jstring_to_utf8(env, js, &len);
    JSValue v = JS_NewStringLen(ctx, s, len);
    free(s);
    return v;
}

/* ---------- errores: se mandan a Host.log con la pila ---------- */
static void log_str(Engine *e, const char *s) {
    JNIEnv *env = e->env; if (!env || !e->host) return;
    jstring js = utf8_to_jstring(env, s, strlen(s));
    (*env)->CallVoidMethod(env, e->host, e->mLog, js);
    (*env)->DeleteLocalRef(env, js);
    if ((*env)->ExceptionCheck(env)) (*env)->ExceptionClear(env);
}
static void report_exception(Engine *e) {
    JSContext *ctx = e->ctx;
    JSValue ex = JS_GetException(ctx);
    const char *msg = JS_ToCString(ctx, ex);
    char buf[4096]; buf[0] = 0;
    snprintf(buf, sizeof buf, "JS: %s", msg ? msg : "?");
    if (msg) JS_FreeCString(ctx, msg);
    if (JS_IsError(ex)) {
        JSValue st = JS_GetPropertyStr(ctx, ex, "stack");
        const char *s = JS_ToCString(ctx, st);
        if (s) { size_t l = strlen(buf); snprintf(buf + l, sizeof buf - l, "\n%s", s); JS_FreeCString(ctx, s); }
        JS_FreeValue(ctx, st);
    }
    JS_FreeValue(ctx, ex);
    log_str(e, buf);
}

/* ---------- funciones que el JS pide a Java ---------- */
static Engine *eng_of(JSContext *ctx) { return (Engine *)JS_GetContextOpaque(ctx); }
static JSValue fn_measure(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    Engine *e = eng_of(ctx); JNIEnv *env = e->env;
    if (argc < 2 || !env) return JS_NewFloat64(ctx, 0);
    jstring t = js_to_jstring(env, ctx, argv[0]), f = js_to_jstring(env, ctx, argv[1]);
    jfloat w = (*env)->CallFloatMethod(env, e->host, e->mMeasure, t, f);
    if ((*env)->ExceptionCheck(env)) { (*env)->ExceptionClear(env); w = 0; }
    (*env)->DeleteLocalRef(env, t); (*env)->DeleteLocalRef(env, f);
    return JS_NewFloat64(ctx, w);
}
static JSValue fn_hasGlyph(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    Engine *e = eng_of(ctx); JNIEnv *env = e->env;
    if (argc < 1 || !env) return JS_TRUE;
    jstring t = js_to_jstring(env, ctx, argv[0]);
    jboolean r = (*env)->CallBooleanMethod(env, e->host, e->mHasGlyph, t);
    if ((*env)->ExceptionCheck(env)) { (*env)->ExceptionClear(env); r = JNI_TRUE; }
    (*env)->DeleteLocalRef(env, t);
    return JS_NewBool(ctx, r);
}
static JSValue fn_storeGet(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    Engine *e = eng_of(ctx); JNIEnv *env = e->env;
    if (argc < 1 || !env) return JS_NULL;
    jstring k = js_to_jstring(env, ctx, argv[0]);
    jstring v = (jstring)(*env)->CallObjectMethod(env, e->host, e->mStoreGet, k);
    if ((*env)->ExceptionCheck(env)) { (*env)->ExceptionClear(env); v = NULL; }
    JSValue r = v ? jstring_to_js(env, ctx, v) : JS_NULL;
    (*env)->DeleteLocalRef(env, k); if (v) (*env)->DeleteLocalRef(env, v);
    return r;
}
static JSValue fn_storeSet(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    Engine *e = eng_of(ctx); JNIEnv *env = e->env;
    if (argc < 1 || !env) return JS_UNDEFINED;
    jstring k = js_to_jstring(env, ctx, argv[0]);
    jstring v = (argc > 1 && !JS_IsNull(argv[1]) && !JS_IsUndefined(argv[1])) ? js_to_jstring(env, ctx, argv[1]) : NULL;
    (*env)->CallVoidMethod(env, e->host, e->mStoreSet, k, v);
    if ((*env)->ExceptionCheck(env)) (*env)->ExceptionClear(env);
    (*env)->DeleteLocalRef(env, k); if (v) (*env)->DeleteLocalRef(env, v);
    return JS_UNDEFINED;
}
static JSValue fn_log(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    Engine *e = eng_of(ctx);
    if (argc < 1) return JS_UNDEFINED;
    const char *s = JS_ToCString(ctx, argv[0]);
    if (s) { log_str(e, s); JS_FreeCString(ctx, s); }
    return JS_UNDEFINED;
}
/* si una llamada tarda más de 3 s, el JS se corta (evita que un fallo cuelgue el reloj) */
static int interrupt_cb(JSContext *ctx, void *opaque) {
    Engine *e = (Engine *)opaque;
    return e->deadline > 0 && now_s() > e->deadline;
}
static void begin_call(Engine *e, JNIEnv *env) { e->env = env; e->deadline = now_s() + 3.0; JS_UpdateStackTop(e->rt); }
static void end_call(Engine *e) { e->deadline = 0; }

static JSValue get_global_fn(Engine *e, const char *name) {
    JSValue gl = JS_GetGlobalObject(e->ctx);
    JSValue f = JS_GetPropertyStr(e->ctx, gl, name);
    JS_FreeValue(e->ctx, gl);
    return f;
}

#define JNIFN(ret, name) JNIEXPORT ret JNICALL Java_com_juegosboom_arcadewatch_JsEngine_##name

JNIFN(jlong, nativeCreate)(JNIEnv *env, jclass cls, jobject host) {
    Engine *e = (Engine *)calloc(1, sizeof(Engine));
    e->env = env;
    e->host = (*env)->NewGlobalRef(env, host);
    jclass hc = (*env)->GetObjectClass(env, host);
    e->mMeasure = (*env)->GetMethodID(env, hc, "measureText", "(Ljava/lang/String;Ljava/lang/String;)F");
    e->mHasGlyph = (*env)->GetMethodID(env, hc, "hasGlyph", "(Ljava/lang/String;)Z");
    e->mStoreGet = (*env)->GetMethodID(env, hc, "storeGet", "(Ljava/lang/String;)Ljava/lang/String;");
    e->mStoreSet = (*env)->GetMethodID(env, hc, "storeSet", "(Ljava/lang/String;Ljava/lang/String;)V");
    e->mLog = (*env)->GetMethodID(env, hc, "log", "(Ljava/lang/String;)V");
    (*env)->DeleteLocalRef(env, hc);
    if (!e->mMeasure || !e->mHasGlyph || !e->mStoreGet || !e->mStoreSet || !e->mLog) { (*env)->ExceptionClear(env); (*env)->DeleteGlobalRef(env, e->host); free(e); return 0; }
    e->rt = JS_NewRuntime();
    JS_SetMemoryLimit(e->rt, 96 * 1024 * 1024);
    JS_SetMaxStackSize(e->rt, 512 * 1024);
    JS_SetInterruptHandler(e->rt, interrupt_cb, e);
    e->ctx = JS_NewContext(e->rt);
    JS_SetContextOpaque(e->ctx, e);
    JSValue gl = JS_GetGlobalObject(e->ctx);
    JS_SetPropertyStr(e->ctx, gl, "__measure", JS_NewCFunction(e->ctx, fn_measure, "__measure", 2));
    JS_SetPropertyStr(e->ctx, gl, "__hasGlyph", JS_NewCFunction(e->ctx, fn_hasGlyph, "__hasGlyph", 1));
    JS_SetPropertyStr(e->ctx, gl, "__storeGet", JS_NewCFunction(e->ctx, fn_storeGet, "__storeGet", 1));
    JS_SetPropertyStr(e->ctx, gl, "__storeSet", JS_NewCFunction(e->ctx, fn_storeSet, "__storeSet", 2));
    JS_SetPropertyStr(e->ctx, gl, "__log", JS_NewCFunction(e->ctx, fn_log, "__log", 1));
    JS_FreeValue(e->ctx, gl);
    return (jlong)(intptr_t)e;
}

JNIFN(void, nativeDestroy)(JNIEnv *env, jclass cls, jlong p) {
    Engine *e = (Engine *)(intptr_t)p; if (!e) return;
    e->env = env;
    JS_FreeContext(e->ctx);
    JS_FreeRuntime(e->rt);
    (*env)->DeleteGlobalRef(env, e->host);
    free(e);
}

/* ejecuta un script; devuelve null si ha ido bien o el texto del error */
JNIFN(jstring, nativeEval)(JNIEnv *env, jclass cls, jlong p, jstring code, jstring file) {
    Engine *e = (Engine *)(intptr_t)p; begin_call(e, env);
    size_t len; char *src = jstring_to_utf8(env, code, &len);
    size_t fl; char *fname = jstring_to_utf8(env, file, &fl);
    JSValue r = JS_Eval(e->ctx, src, len, fname ? fname : "script.js", JS_EVAL_TYPE_GLOBAL);
    free(src); free(fname);
    jstring err = NULL;
    if (JS_IsException(r)) {
        JSValue ex = JS_GetException(e->ctx);
        char buf[4096]; const char *m = JS_ToCString(e->ctx, ex); snprintf(buf, sizeof buf, "%s", m ? m : "error"); if (m) JS_FreeCString(e->ctx, m);
        if (JS_IsError(ex)) { JSValue st = JS_GetPropertyStr(e->ctx, ex, "stack"); const char *s = JS_ToCString(e->ctx, st); if (s) { size_t l = strlen(buf); snprintf(buf + l, sizeof buf - l, "\n%s", s); JS_FreeCString(e->ctx, s); } JS_FreeValue(e->ctx, st); }
        JS_FreeValue(e->ctx, ex);
        err = utf8_to_jstring(env, buf, strlen(buf));
    }
    JS_FreeValue(e->ctx, r);
    end_call(e);
    return err;
}

/* llama a una función global con hasta 4 números; devuelve el resultado como número (NaN si falla) */
JNIFN(jdouble, nativeCallN)(JNIEnv *env, jclass cls, jlong p, jstring name, jint argc, jdouble a, jdouble b, jdouble c, jdouble d) {
    Engine *e = (Engine *)(intptr_t)p; begin_call(e, env);
    size_t nl; char *fname = jstring_to_utf8(env, name, &nl);
    JSValue f = get_global_fn(e, fname); free(fname);
    double res = 0.0 / 0.0;
    if (JS_IsFunction(e->ctx, f)) {
        JSValue args[4] = { JS_NewFloat64(e->ctx, a), JS_NewFloat64(e->ctx, b), JS_NewFloat64(e->ctx, c), JS_NewFloat64(e->ctx, d) };
        JSValue r = JS_Call(e->ctx, f, JS_UNDEFINED, argc < 0 ? 0 : argc > 4 ? 4 : argc, args);
        if (JS_IsException(r)) report_exception(e);
        else if (JS_IsUndefined(r) || JS_IsNull(r)) res = 0;
        else if (JS_ToFloat64(e->ctx, &res, r)) res = 0.0 / 0.0;
        JS_FreeValue(e->ctx, r);
    }
    JS_FreeValue(e->ctx, f);
    end_call(e);
    return res;
}

/* llama a una función global con (texto) o (texto, número); devuelve el resultado como texto (null si no hay) */
JNIFN(jstring, nativeCallS)(JNIEnv *env, jclass cls, jlong p, jstring name, jint argc, jstring s, jdouble n) {
    Engine *e = (Engine *)(intptr_t)p; begin_call(e, env);
    size_t nl; char *fname = jstring_to_utf8(env, name, &nl);
    JSValue f = get_global_fn(e, fname); free(fname);
    jstring out = NULL;
    if (JS_IsFunction(e->ctx, f)) {
        JSValue args[2] = { jstring_to_js(env, e->ctx, s), JS_NewFloat64(e->ctx, n) };
        JSValue r = JS_Call(e->ctx, f, JS_UNDEFINED, argc < 0 ? 0 : argc > 2 ? 2 : argc, args);
        JS_FreeValue(e->ctx, args[0]);
        if (JS_IsException(r)) report_exception(e);
        else if (!JS_IsUndefined(r) && !JS_IsNull(r)) out = js_to_jstring(env, e->ctx, r);
        JS_FreeValue(e->ctx, r);
    }
    JS_FreeValue(e->ctx, f);
    end_call(e);
    return out;
}

/* copia en out el Float32Array que devuelve la función global «name» (sin argumentos); devuelve cuántos números hay.
   Si out es pequeño, devuelve -(los que hacen falta) y no copia nada. limit = cuántos copiar como mucho (-1 = todos). */
static jint copy_f32(Engine *e, JNIEnv *env, const char *name, jfloatArray out, jint limit) {
    JSValue f = get_global_fn(e, name);
    jint res = 0;
    if (JS_IsFunction(e->ctx, f)) {
        JSValue arr = JS_Call(e->ctx, f, JS_UNDEFINED, 0, NULL);
        if (JS_IsException(arr)) { report_exception(e); res = 0; }
        else {
            size_t off = 0, blen = 0, bpe = 0;
            JSValue ab = JS_GetTypedArrayBuffer(e->ctx, arr, &off, &blen, &bpe);
            if (JS_IsException(ab)) { JS_FreeValue(e->ctx, JS_GetException(e->ctx)); }
            else {
                size_t sz = 0; uint8_t *data = JS_GetArrayBuffer(e->ctx, &sz, ab);
                jint count = (jint)(blen / 4);
                if (limit >= 0 && limit < count) count = limit;
                jint cap = out ? (*env)->GetArrayLength(env, out) : 0;
                if (data && bpe == 4) {
                    if (count > cap) res = -count;
                    else { (*env)->SetFloatArrayRegion(env, out, 0, count, (const jfloat *)(data + off)); res = count; }
                }
                JS_FreeValue(e->ctx, ab);
            }
        }
        JS_FreeValue(e->ctx, arr);
    }
    JS_FreeValue(e->ctx, f);
    return res;
}

/* un fotograma: __frame(ms) y copia de las órdenes de dibujo. Devuelve el número de órdenes (negativo si out es pequeño;
   en ese caso se puede volver a pedir la copia con nativeCopyCommands sin repetir el fotograma). */
JNIFN(jint, nativeFrame)(JNIEnv *env, jclass cls, jlong p, jdouble ms, jfloatArray out) {
    Engine *e = (Engine *)(intptr_t)p; begin_call(e, env);
    JSValue f = get_global_fn(e, "__frame");
    jint len = 0;
    if (JS_IsFunction(e->ctx, f)) {
        JSValue a = JS_NewFloat64(e->ctx, ms);
        JSValue r = JS_Call(e->ctx, f, JS_UNDEFINED, 1, &a);
        if (JS_IsException(r)) report_exception(e);
        else { double d = 0; JS_ToFloat64(e->ctx, &d, r); len = (jint)d; }
        JS_FreeValue(e->ctx, r);
    }
    JS_FreeValue(e->ctx, f);
    jint res = len > 0 ? copy_f32(e, env, "__cmdBuf", out, len) : 0;
    end_call(e);
    return res;
}
JNIFN(jint, nativeCopyCommands)(JNIEnv *env, jclass cls, jlong p, jfloatArray out) {
    Engine *e = (Engine *)(intptr_t)p; begin_call(e, env);
    JSValue f = get_global_fn(e, "__cmdLen");
    double d = 0;
    if (JS_IsFunction(e->ctx, f)) { JSValue r = JS_Call(e->ctx, f, JS_UNDEFINED, 0, NULL); JS_ToFloat64(e->ctx, &d, r); JS_FreeValue(e->ctx, r); }
    JS_FreeValue(e->ctx, f);
    jint res = copy_f32(e, env, "__cmdBuf", out, (jint)d);
    end_call(e);
    return res;
}
/* sonidos pendientes (Float32Array de __takeSounds): devuelve cuántos números se han copiado en out */
JNIFN(jint, nativeTakeSoundsInto)(JNIEnv *env, jclass cls, jlong p, jfloatArray out) {
    Engine *e = (Engine *)(intptr_t)p; begin_call(e, env);
    jint n = copy_f32(e, env, "__takeSounds", out, (*env)->GetArrayLength(env, out));
    end_call(e);
    return n < 0 ? 0 : n;
}
