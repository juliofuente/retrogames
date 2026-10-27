# libarcadejs.so: QuickJS-ng + el puente JNI (arcade_jni.c). Lo compila Android Studio con el NDK.
cmake_minimum_required(VERSION 3.22.1)
project(arcadejs C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

set(QJS ${CMAKE_CURRENT_SOURCE_DIR}/quickjs)
add_library(arcadejs SHARED
    arcade_jni.c
    ${QJS}/quickjs.c
    ${QJS}/libregexp.c
    ${QJS}/libunicode.c
    ${QJS}/dtoa.c)
target_include_directories(arcadejs PRIVATE ${QJS})
target_compile_definitions(arcadejs PRIVATE _GNU_SOURCE)
target_compile_options(arcadejs PRIVATE -O2 -funsigned-char -Wno-implicit-fallthrough -Wno-sign-compare
    -Wno-unused-parameter -Wno-unused-but-set-variable -Wno-unused-function -Wno-unused-variable)
target_link_libraries(arcadejs m)
