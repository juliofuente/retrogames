/* Emoji Quest · la historia: zonas, personajes, lecciones, misiones y preguntas.
   {name} se cambia por el nombre del jugador. Cada misión (paso) es: hablar con un personaje y hacer sus eventos:
     say   el personaje dice algo (inglés + español)            lesson  tarjeta de una estructura nueva (sale antes de usarla)
     ask   pregunta con respuestas en inglés (ok = correctas)   build   montar una frase con fichas
     game  minijuego: listen (oír y elegir), pairs (parejas), rain (lluvia de palabras), spell (deletrear), count (contar)
     give  regalo (llave, objeto…) */
window.EQ = (function () {
  /* ---------- vocabulario: [emoji, inglés, español] ---------- */
  const V = {
    greet: [['👋', 'hello', 'hola'], ['🙋', 'hi', 'hola (más informal)'], ['👋😊', 'goodbye', 'adiós'], ['🌅', 'good morning', 'buenos días'], ['🌙', 'good night', 'buenas noches'], ['🙏', 'thank you', 'gracias']],
    nums: [['1️⃣', 'one', 'uno'], ['2️⃣', 'two', 'dos'], ['3️⃣', 'three', 'tres'], ['4️⃣', 'four', 'cuatro'], ['5️⃣', 'five', 'cinco'], ['6️⃣', 'six', 'seis'], ['7️⃣', 'seven', 'siete'], ['8️⃣', 'eight', 'ocho'], ['9️⃣', 'nine', 'nueve'], ['🔟', 'ten', 'diez']],
    colours: [['🔴', 'red', 'rojo'], ['🔵', 'blue', 'azul'], ['🟢', 'green', 'verde'], ['🟡', 'yellow', 'amarillo'], ['🟠', 'orange', 'naranja'], ['🟣', 'purple', 'morado'], ['🩷', 'pink', 'rosa'], ['⚫', 'black', 'negro'], ['⚪', 'white', 'blanco'], ['🟤', 'brown', 'marrón']],
    food: [['🍎', 'apple', 'manzana'], ['🍌', 'banana', 'plátano'], ['🍞', 'bread', 'pan'], ['🧀', 'cheese', 'queso'], ['🥛', 'milk', 'leche'], ['🥚', 'egg', 'huevo'], ['🍕', 'pizza', 'pizza'], ['🍰', 'cake', 'tarta'], ['🥕', 'carrot', 'zanahoria'], ['💧', 'water', 'agua']],
    animals: [['🐶', 'dog', 'perro'], ['🐱', 'cat', 'gato'], ['🐮', 'cow', 'vaca'], ['🐷', 'pig', 'cerdo'], ['🐴', 'horse', 'caballo'], ['🐑', 'sheep', 'oveja'], ['🦆', 'duck', 'pato'], ['🐔', 'chicken', 'gallina'], ['🐰', 'rabbit', 'conejo'], ['🐸', 'frog', 'rana']],
    places: [['🏫', 'school', 'colegio'], ['🌳', 'park', 'parque'], ['🏪', 'shop', 'tienda'], ['🏠', 'house', 'casa'], ['🏥', 'hospital', 'hospital'], ['📚', 'library', 'biblioteca'], ['🏖️', 'beach', 'playa'], ['🚉', 'station', 'estación']],
    preps: [['📦⬇️', 'in', 'dentro de'], ['📦⬆️', 'on', 'encima de'], ['🛏️⬇️', 'under', 'debajo de'], ['🌳➡️', 'next to', 'al lado de'], ['🏠⬅️', 'behind', 'detrás de']],
    actions: [['🏃', 'run', 'correr'], ['🏊', 'swim', 'nadar'], ['🕊️', 'fly', 'volar'], ['🦘', 'jump', 'saltar'], ['🧗', 'climb', 'trepar'], ['💃', 'dance', 'bailar'], ['🎤', 'sing', 'cantar'], ['📖', 'read', 'leer']],
    ing: [['📖', 'reading', 'leyendo'], ['🍳', 'cooking', 'cocinando'], ['🎨', 'painting', 'pintando'], ['⚽', 'playing', 'jugando'], ['😴', 'sleeping', 'durmiendo'], ['🍽️', 'eating', 'comiendo'], ['🎵', 'singing', 'cantando'], ['🛁', 'washing', 'lavando']],
    past: [['⚽', 'played', 'jugué'], ['🚶', 'went', 'fui'], ['🍽️', 'ate', 'comí'], ['👀', 'saw', 'vi'], ['🧳', 'visited', 'visité'], ['📺', 'watched', 'vi (la tele)'], ['🏠', 'stayed', 'me quedé'], ['🎂', 'had', 'tuve / tomé']],
  };

  /* ---------- lecciones (estructuras): sale la tarjeta antes de usarlas ---------- */
  const L = {
    hello: { t: 'Saludar', icon: '👋', es: 'Para saludar y despedirte.', pat: 'Hello! · Hi! · Goodbye! · Bye!', use: '<b>Hello</b> y <b>Hi</b> = hola (Hi es más de amigos). <b>Goodbye</b> o <b>Bye</b> = adiós. Por la mañana también se dice <b>Good morning</b>.',
      ex: [['Hello, Tom!', '¡Hola, Tom!', '👋'], ['Good morning, Mum!', '¡Buenos días, mamá!', '🌅'], ['Goodbye! See you!', '¡Adiós! ¡Nos vemos!', '👋😊']], tip: 'Por la noche, al irte a dormir: <b>Good night</b>.' },
    name: { t: '¿Cómo te llamas?', icon: '📛', es: 'Para preguntar el nombre y decir el tuyo.', pat: "What's your name? → My name is ___. / I'm ___.", use: "<b>What's your name?</b> = ¿cómo te llamas? (literalmente: ¿cuál es tu nombre?). Se responde <b>My name is…</b> o <b>I'm…</b>",
      ex: [["What's your name?", '¿Cómo te llamas?', '❓'], ['My name is Lily.', 'Me llamo Lily.', '👧'], ["I'm Tom.", 'Soy Tom.', '👦']], tip: "<b>What's</b> es la forma corta de <b>What is</b>. Y <b>Nice to meet you</b> = encantado de conocerte." },
    howare: { t: '¿Qué tal?', icon: '🙂', es: 'Para preguntar cómo está alguien y responder.', pat: "How are you? → I'm fine, thank you. And you?", use: '<b>How are you?</b> = ¿cómo estás? Lo normal es responder <b>I\'m fine, thank you</b> (estoy bien, gracias) o <b>I\'m OK</b>.',
      ex: [['How are you?', '¿Cómo estás?', '🙂'], ["I'm fine, thank you.", 'Estoy bien, gracias.', '😊'], ["I'm tired.", 'Estoy cansado.', '😴']], tip: 'Para devolver la pregunta: <b>And you?</b> = ¿y tú?' },
    numbers: { t: 'Los números', icon: '🔢', es: 'Contar del 1 al 10.', pat: 'one, two, three, four, five, six, seven, eight, nine, ten', use: 'Para contar cosas: <b>three apples</b> (tres manzanas). Si hay más de una cosa, la palabra lleva <b>-s</b>.',
      ex: [['one cat', 'un gato', '🐱'], ['two dogs', 'dos perros', '🐶🐶'], ['five stars', 'cinco estrellas', '⭐⭐⭐⭐⭐']], tip: '¿Cuántos? = <b>How many?</b> How many cats? → Two cats.' },
    age: { t: '¿Cuántos años tienes?', icon: '🎂', es: 'En inglés la edad se dice con «ser», no con «tener».', pat: "How old are you? → I'm seven. / I'm seven years old.", use: '<b>How old are you?</b> = ¿cuántos años tienes? Se responde con <b>I am</b>: I am eight (literalmente: «soy ocho»). Nunca «I have eight».',
      ex: [['How old are you?', '¿Cuántos años tienes?', '🎂'], ["I'm nine.", 'Tengo nueve años.', '9️⃣'], ['She is ten years old.', 'Ella tiene diez años.', '👧']], tip: '¡Ojo! Tener años = <b>be</b>: I <b>am</b> seven, she <b>is</b> ten.' },
    colours: { t: 'Los colores', icon: '🎨', es: 'Los colores van DELANTE de la cosa.', pat: 'red, blue, green, yellow, orange, purple, pink, black, white, brown', use: 'En inglés el color va antes: <b>a red car</b> = un coche rojo. Y no cambia en plural: <b>red cars</b>.',
      ex: [['a red apple', 'una manzana roja', '🍎'], ['a blue car', 'un coche azul', '🚙'], ['green frogs', 'ranas verdes', '🐸🐸']], tip: 'Primero el color, luego la cosa: <b>yellow banana</b>, nunca «banana yellow».' },
    whatcolour: { t: '¿De qué color es?', icon: '❓', es: 'Para preguntar y decir el color de algo.', pat: "What colour is it? → It's ___.", use: "<b>What colour is it?</b> = ¿de qué color es? Se responde <b>It's red</b> (es rojo). <b>It's</b> = It is.",
      ex: [['What colour is it?', '¿De qué color es?', '❓'], ["It's yellow.", 'Es amarillo.', '🍌'], ['The sky is blue.', 'El cielo es azul.', '🌤️']], tip: 'Para varias cosas: What colour <b>are</b> they? → They <b>are</b> green.' },
    food: { t: 'La comida', icon: '🍎', es: 'Palabras de comida y bebida.', pat: 'apple, banana, bread, cheese, milk, egg, pizza, cake, carrot, water', use: 'Con una sola cosa se pone <b>a</b> o <b>an</b>: <b>an apple</b>, <b>a banana</b>. Leche, agua o pan no se cuentan: <b>some milk</b>.',
      ex: [['an apple', 'una manzana', '🍎'], ['a carrot', 'una zanahoria', '🥕'], ['some bread', 'pan', '🍞']], tip: '<b>an</b> va delante de sonido de vocal: an apple, an egg.' },
    like: { t: 'Me gusta / no me gusta', icon: '😋', es: 'Para decir lo que te gusta y preguntarlo.', pat: "I like ___. · I don't like ___. · Do you like ___? → Yes, I do. / No, I don't.", use: '<b>I like pizza</b> = me gusta la pizza. <b>I don\'t like…</b> = no me gusta. Para preguntar: <b>Do you like…?</b> y se responde corto: <b>Yes, I do</b> / <b>No, I don\'t</b>.',
      ex: [['I like cake.', 'Me gusta la tarta.', '🍰'], ["I don't like carrots.", 'No me gustan las zanahorias.', '🥕'], ['Do you like milk? — Yes, I do.', '¿Te gusta la leche? — Sí.', '🥛']], tip: 'Ojo: en inglés no se dice «Yes, I like» a secas: <b>Yes, I do</b>.' },
    please: { t: 'Pedir algo', icon: '🙏', es: 'Para pedir cosas con educación en una tienda.', pat: "Can I have ___, please? · Here you are. · Thank you!", use: '<b>Can I have…, please?</b> = ¿me das…, por favor? Al darte algo te dicen <b>Here you are</b> (aquí tienes) y tú dices <b>Thank you</b>.',
      ex: [['Can I have an apple, please?', '¿Me das una manzana, por favor?', '🍎'], ['Here you are.', 'Aquí tienes.', '🤲'], ['Thank you!', '¡Gracias!', '🙏']], tip: '<b>please</b> = por favor. ¡Siempre funciona!' },
    animals: { t: 'Los animales', icon: '🐮', es: 'Animales de la granja y de casa.', pat: 'dog, cat, cow, pig, horse, sheep, duck, chicken, rabbit, frog', use: 'Para decir qué animal es: <b>It\'s a cow</b> (es una vaca). En plural se añade -s: dogs, cats… pero <b>sheep</b> no cambia.',
      ex: [["It's a dog.", 'Es un perro.', '🐶'], ['two cats', 'dos gatos', '🐱🐱'], ['three sheep', 'tres ovejas', '🐑🐑🐑']], tip: '¿Qué es? = <b>What is it?</b>' },
    have: { t: 'Tengo / tiene', icon: '🎒', es: 'Para decir lo que alguien tiene.', pat: 'I have ___. · He / She / It has ___.', use: '<b>I have a dog</b> = tengo un perro. Con he, she o it se dice <b>has</b>: <b>It has four legs</b> = tiene cuatro patas.',
      ex: [['I have a cat.', 'Tengo un gato.', '🐱'], ['The duck has two legs.', 'El pato tiene dos patas.', '🦆'], ['She has a rabbit.', 'Ella tiene un conejo.', '🐰']], tip: 'I, you, we, they → <b>have</b> · he, she, it → <b>has</b>.' },
    where: { t: '¿Dónde está?', icon: '📍', es: 'Para preguntar dónde está algo y responder.', pat: "Where is the ___? → It's in / on / under / next to / behind the ___.", use: '<b>Where is…?</b> = ¿dónde está…? <b>in</b> = dentro, <b>on</b> = encima, <b>under</b> = debajo, <b>next to</b> = al lado, <b>behind</b> = detrás.',
      ex: [['Where is the cat?', '¿Dónde está el gato?', '🐱'], ["It's in the box.", 'Está dentro de la caja.', '📦'], ["It's under the bed.", 'Está debajo de la cama.', '🛏️']], tip: 'Para varios: Where <b>are</b> the keys? → They <b>are</b> on the table.' },
    can: { t: 'Puedo, sé hacer', icon: '💪', es: 'Para decir lo que alguien sabe o puede hacer.', pat: "I can ___. · I can't ___. · Can you ___? → Yes, I can. / No, I can't.", use: '<b>can</b> = poder, saber hacer. <b>can\'t</b> = no poder. El verbo de detrás va sin to: <b>I can swim</b>. Respuesta corta: <b>Yes, I can</b> / <b>No, I can\'t</b>.',
      ex: [['I can swim.', 'Sé nadar.', '🏊'], ["Fish can't fly.", 'Los peces no pueden volar.', '🐟'], ['Can you dance? — Yes, I can.', '¿Sabes bailar? — Sí.', '💃']], tip: '<b>can</b> no cambia nunca: he can, she can, they can.' },
    doing: { t: '¿Qué estás haciendo?', icon: '⏱️', es: 'Para lo que pasa AHORA MISMO.', pat: "What are you doing? → I'm ___ing. · He / She is ___ing.", use: 'Se forma con <b>am / is / are</b> + verbo con <b>-ing</b>: <b>I\'m reading</b> (estoy leyendo), <b>She is cooking</b> (ella está cocinando).',
      ex: [['What are you doing?', '¿Qué estás haciendo?', '❓'], ["I'm painting.", 'Estoy pintando.', '🎨'], ['They are playing football.', 'Están jugando al fútbol.', '⚽']], tip: 'I → <b>am</b> · he, she, it → <b>is</b> · you, we, they → <b>are</b>.' },
    past: { t: 'Lo que hice ayer', icon: '⏪', es: 'Para contar cosas que ya pasaron.', pat: 'Yesterday I played / went / ate / saw… · What did you do yesterday?', use: 'Muchos verbos en pasado acaban en <b>-ed</b>: play → <b>played</b>, visit → <b>visited</b>. Otros son irregulares: go → <b>went</b>, eat → <b>ate</b>, see → <b>saw</b>.',
      ex: [['Yesterday I played football.', 'Ayer jugué al fútbol.', '⚽'], ['I went to the park.', 'Fui al parque.', '🌳'], ['What did you do yesterday?', '¿Qué hiciste ayer?', '❓']], tip: 'En la pregunta con <b>did</b>, el verbo va normal: What did you <b>do</b>? Did you <b>play</b>?' },
  };

  /* ---------- zonas (habitaciones del mapa 3×3) y misiones ---------- */
  // pos: [col, fila] de la zona · gate: hacia dónde está la puerta a la siguiente zona · land: edificio principal
  const Z = [
    { id: 'village', name: 'Emoji Village', es: 'El pueblo', pos: [0, 2], ground: '#9ccc65', path: '#e6d3a3', land: '⛲', deco: ['🌷', '🌼', '🏡', '🏠'],
      npcs: [{ id: 'mayor', e: '👴', name: 'Mayor Bob', at: [6, 3] }, { id: 'lily', e: '👧', name: 'Lily', at: [3, 5] }, { id: 'tom', e: '👦', name: 'Tom', at: [7, 6] }],
      lessons: ['hello', 'name', 'howare'],
      steps: [
        { npc: 'mayor', hint: 'Habla con el alcalde 👴', ev: [
          { t: 'say', en: 'Hello! Welcome to Emoji Village!', es: '¡Hola! ¡Bienvenido a Emoji Village!' },
          { t: 'lesson', id: 'hello' },
          { t: 'ask', en: 'Hello! 👋', es: '¡Hola!', q: 'Contesta al saludo', opts: ['Hello!', 'Goodbye!', 'Thank you!'], ok: [0] },
          { t: 'say', en: "I'm the mayor. Talk to Lily and Tom, please!", es: 'Soy el alcalde. ¡Habla con Lily y Tom, por favor!' }] },
        { npc: 'lily', hint: 'Habla con Lily 👧', ev: [
          { t: 'lesson', id: 'name' },
          { t: 'ask', en: "Hi! I'm Lily. What's your name?", es: '¡Hola! Soy Lily. ¿Cómo te llamas?', opts: ['My name is {name}.', "I'm fine.", 'It is red.'], ok: [0] },
          { t: 'say', en: 'Nice to meet you, {name}!', es: '¡Encantada de conocerte, {name}!' },
          { t: 'build', es: 'Me llamo Lily.', en: 'My name is Lily' }] },
        { npc: 'tom', hint: 'Habla con Tom 👦', ev: [
          { t: 'lesson', id: 'howare' },
          { t: 'ask', en: 'Good morning! How are you?', es: '¡Buenos días! ¿Cómo estás?', opts: ["I'm fine, thank you.", "I'm Tom.", 'Goodbye.'], ok: [0] },
          { t: 'game', kind: 'pairs', set: 'greet', title: 'Une cada saludo con su dibujo' },
          { t: 'say', en: 'Great! Bye, {name}!', es: '¡Genial! ¡Adiós, {name}!' }] },
        { npc: 'mayor', hint: 'Vuelve con el alcalde 👴', ev: [
          { t: 'ask', en: 'Did you meet Lily and Tom?', es: '¿Has conocido a Lily y a Tom?', opts: ['Yes! Thank you!', 'Red and blue.', "I'm seven."], ok: [0] },
          { t: 'say', en: 'Well done! Here is the key to the school.', es: '¡Muy bien! Aquí tienes la llave del colegio.' },
          { t: 'give', e: '🗝️', en: 'the school key', es: 'la llave del colegio' }] }],
      review: [
        { en: 'Hello!', es: '¡Hola!', opts: ['Hi!', 'Six.', 'Blue.'], ok: [0] },
        { en: "What's your name?", es: '¿Cómo te llamas?', opts: ["I'm {name}.", "I'm fine.", "It's a cat."], ok: [0] },
        { en: 'How are you?', es: '¿Cómo estás?', opts: ["I'm OK, thank you.", 'My name is Bob.', 'Yes, I can.'], ok: [0] },
        { en: 'Good night!', es: '¡Buenas noches!', opts: ['Good night!', 'Good morning!', "I'm ten."], ok: [0] }] },

    { id: 'school', name: 'Sunny School', es: 'El colegio', pos: [1, 2], ground: '#a5d6a7', path: '#eadbb4', land: '🏫', deco: ['✏️', '📚', '🎒', '🌻'],
      npcs: [{ id: 'teacher', e: '👩‍🏫', name: 'Ms Green', at: [5, 3] }, { id: 'mia', e: '👧🏽', name: 'Mia', at: [2, 5] }, { id: 'sam', e: '👦🏻', name: 'Sam', at: [7, 5] }],
      lessons: ['numbers', 'age'],
      steps: [
        { npc: 'teacher', hint: 'Habla con la profe 👩‍🏫', ev: [
          { t: 'say', en: "Good morning, {name}! Let's count!", es: '¡Buenos días, {name}! ¡Vamos a contar!' },
          { t: 'lesson', id: 'numbers' },
          { t: 'game', kind: 'count', set: 'nums', title: '¿Cuántos hay? Elige el número' }] },
        { npc: 'mia', hint: 'Habla con Mia 👧🏽', ev: [
          { t: 'lesson', id: 'age' },
          { t: 'ask', en: "I'm eight. How old are you?", es: 'Tengo ocho años. ¿Cuántos años tienes tú?', opts: ["I'm nine.", 'I have nine.', 'My name is nine.'], ok: [0], why: 'La edad se dice con <b>I am</b> (I\'m), nunca con «I have».' },
          { t: 'build', es: 'Tengo diez años.', en: 'I am ten years old' }] },
        { npc: 'sam', hint: 'Habla con Sam 👦🏻', ev: [
          { t: 'ask', en: 'How many pencils? ✏️✏️✏️', es: '¿Cuántos lápices?', opts: ['Three.', 'Two.', 'Five.'], ok: [0] },
          { t: 'ask', en: 'How many apples? 🍎🍎🍎🍎🍎🍎🍎', es: '¿Cuántas manzanas?', opts: ['Seven.', 'Six.', 'Eight.'], ok: [0] },
          { t: 'game', kind: 'spell', set: 'nums', title: 'Escribe el número en inglés' }] },
        { npc: 'teacher', hint: 'Vuelve con la profe 👩‍🏫', ev: [
          { t: 'ask', en: 'What is five and five?', es: '¿Cuánto es cinco y cinco?', opts: ['Ten.', 'Nine.', 'Four.'], ok: [0] },
          { t: 'say', en: 'Excellent! Here is a paintbrush for the garden.', es: '¡Excelente! Aquí tienes un pincel para el jardín.' },
          { t: 'give', e: '🖌️', en: 'a paintbrush', es: 'un pincel' }] }],
      review: [
        { en: 'How old are you?', es: '¿Cuántos años tienes?', opts: ["I'm eight.", 'I have eight.', 'Eight years.'], ok: [0] },
        { en: 'How many cats? 🐱🐱', es: '¿Cuántos gatos?', opts: ['Two.', 'Three.', 'One.'], ok: [0] },
        { en: 'What number is it? 🔟', es: '¿Qué número es?', opts: ['Ten.', 'Two.', 'Seven.'], ok: [0] },
        { en: 'How many stars? ⭐⭐⭐⭐', es: '¿Cuántas estrellas?', opts: ['Four.', 'Five.', 'Six.'], ok: [0] }] },

    { id: 'garden', name: 'Rainbow Garden', es: 'El jardín', pos: [2, 2], ground: '#c5e1a5', path: '#ead8b0', land: '🌈', deco: ['🌹', '🌻', '🌷', '🦋'],
      npcs: [{ id: 'painter', e: '👨‍🎨', name: 'Pablo', at: [5, 3] }, { id: 'gardener', e: '👩‍🌾', name: 'Rosa', at: [2, 5] }, { id: 'snail', e: '🐌', name: 'Shelly', at: [7, 6] }],
      lessons: ['colours', 'whatcolour'],
      steps: [
        { npc: 'painter', hint: 'Habla con el pintor 👨‍🎨', ev: [
          { t: 'say', en: "Hello, {name}! I can't paint. I need the colours!", es: '¡Hola, {name}! No puedo pintar. ¡Necesito los colores!' },
          { t: 'lesson', id: 'colours' },
          { t: 'game', kind: 'listen', set: 'colours', title: 'Escucha y toca el color' }] },
        { npc: 'gardener', hint: 'Habla con Rosa, la jardinera 👩‍🌾', ev: [
          { t: 'lesson', id: 'whatcolour' },
          { t: 'ask', en: '🍌 What colour is it?', es: '¿De qué color es?', opts: ["It's yellow.", "It's blue.", "It's a banana."], ok: [0] },
          { t: 'ask', en: '🍓 What colour is the strawberry?', es: '¿De qué color es la fresa?', opts: ["It's red.", "It's green.", "It's purple."], ok: [0] },
          { t: 'ask', en: '🐸 What colour is the frog?', es: '¿De qué color es la rana?', opts: ["It's green.", "It's pink.", 'Green is it.'], ok: [0] }] },
        { npc: 'snail', hint: 'Habla con el caracol 🐌', ev: [
          { t: 'say', en: 'Help! The colours are falling from the rainbow!', es: '¡Socorro! ¡Los colores se caen del arcoíris!' },
          { t: 'game', kind: 'rain', good: 'colours', bad: ['animals', 'food'], title: 'Atrapa solo los COLORES' },
          { t: 'build', es: 'El cielo es azul.', en: 'The sky is blue' }] },
        { npc: 'painter', hint: 'Vuelve con el pintor 👨‍🎨', ev: [
          { t: 'ask', en: 'I want a red car. Which one? 🚗 🚙 🚕', es: 'Quiero un coche rojo. ¿Cuál?', opts: ['🚗', '🚙', '🚕'], ok: [0] },
          { t: 'say', en: 'Thank you, {name}! Take this basket to the market.', es: '¡Gracias, {name}! Lleva esta cesta al mercado.' },
          { t: 'give', e: '🧺', en: 'a basket', es: 'una cesta' }] }],
      review: [
        { en: '🍊 What colour is it?', es: '¿De qué color es?', opts: ["It's orange.", "It's black.", "It's white."], ok: [0] },
        { en: '¿Cómo se dice «un coche azul»?', es: '', opts: ['a blue car', 'a car blue', 'a blues car'], ok: [0] },
        { en: '🐘 What colour is the elephant?', es: '¿De qué color es el elefante?', opts: ["It's grey.", "It's pink.", "It's green."], ok: [0] },
        { en: '⚪ What colour is it?', es: '¿De qué color es?', opts: ["It's white.", "It's black.", "It's brown."], ok: [0] }] },

    { id: 'market', name: 'Yummy Market', es: 'El mercado', pos: [2, 1], ground: '#ffe0b2', path: '#f3d9a6', land: '🏪', deco: ['🍎', '🥖', '🧺', '🍉'],
      npcs: [{ id: 'fruit', e: '🧑‍🌾', name: 'Fred', at: [6, 3] }, { id: 'baker', e: '👩‍🍳', name: 'Betty', at: [2, 4] }, { id: 'kid', e: '🧒', name: 'Leo', at: [7, 6] }, { id: 'hats', e: '🧑‍🎤', name: 'Hat shop', at: [4, 6], shop: true }],
      lessons: ['food', 'like', 'please'],
      steps: [
        { npc: 'fruit', hint: 'Habla con Fred, el frutero 🧑‍🌾', ev: [
          { t: 'say', en: 'Hello! Welcome to the market. Look at my food!', es: '¡Hola! Bienvenido al mercado. ¡Mira mi comida!' },
          { t: 'lesson', id: 'food' },
          { t: 'game', kind: 'pairs', set: 'food', title: 'Une cada comida con su nombre' }] },
        { npc: 'baker', hint: 'Habla con Betty, la panadera 👩‍🍳', ev: [
          { t: 'lesson', id: 'like' },
          { t: 'ask', en: 'Do you like cake? 🍰', es: '¿Te gusta la tarta?', opts: ['Yes, I do.', 'Yes, I like.', 'Yes, I am.'], ok: [0], why: 'A «Do you like…?» se responde <b>Yes, I do</b> o <b>No, I don\'t</b>.' },
          { t: 'ask', en: 'Do you like carrots? 🥕 (dile que no)', es: '¿Te gustan las zanahorias? (contesta que no)', opts: ["No, I don't.", 'No, I not.', "No, I doesn't."], ok: [0] },
          { t: 'build', es: 'Me gusta la pizza.', en: 'I like pizza' }] },
        { npc: 'kid', hint: 'Ayuda a Leo 🧒 a comprar', ev: [
          { t: 'lesson', id: 'please' },
          { t: 'say', en: "I'm hungry! How do I ask for an apple?", es: '¡Tengo hambre! ¿Cómo pido una manzana?' },
          { t: 'ask', en: '¿Qué dice Leo en la tienda? 🍎', es: '', opts: ['Can I have an apple, please?', 'Give apple!', 'I like apple.'], ok: [0] },
          { t: 'build', es: '¿Me das una manzana, por favor?', en: 'Can I have an apple please' }] },
        { npc: 'fruit', hint: 'Vuelve con Fred 🧑‍🌾', ev: [
          { t: 'ask', en: 'Here you are!', es: '¡Aquí tienes!', opts: ['Thank you!', 'Hello!', 'Yes, I do.'], ok: [0] },
          { t: 'say', en: 'You are very polite! Take this bone for the farm dog.', es: '¡Qué educado! Toma este hueso para el perro de la granja.' },
          { t: 'give', e: '🦴', en: 'a bone', es: 'un hueso' }] }],
      review: [
        { en: 'Do you like milk? 🥛', es: '¿Te gusta la leche?', opts: ['Yes, I do.', 'Yes, I like.', 'Yes, it is.'], ok: [0] },
        { en: '¿Cómo se dice «un huevo»? 🥚', es: '', opts: ['an egg', 'a egg', 'egg a'], ok: [0] },
        { en: '¿Cómo pides pan? 🍞', es: '', opts: ['Can I have some bread, please?', 'Bread me!', 'I bread, please.'], ok: [0] },
        { en: 'What is it? 🧀', es: '¿Qué es?', opts: ["It's cheese.", "It's milk.", "It's bread."], ok: [0] }] },

    { id: 'farm', name: 'Happy Farm', es: 'La granja', pos: [1, 1], ground: '#dcedc8', path: '#dcc08e', land: '🛖', deco: ['🌾', '🌽', '🚜', '🌻'],
      npcs: [{ id: 'farmer', e: '👨‍🌾', name: 'Farmer Joe', at: [5, 3] }, { id: 'cow', e: '🐮', name: 'Daisy', at: [2, 5] }, { id: 'dog', e: '🐶', name: 'Rex', at: [7, 5] }],
      lessons: ['animals', 'have'],
      steps: [
        { npc: 'farmer', hint: 'Habla con el granjero 👨‍🌾', ev: [
          { t: 'say', en: 'Hello, {name}! The animals are hungry. Help me!', es: '¡Hola, {name}! Los animales tienen hambre. ¡Ayúdame!' },
          { t: 'lesson', id: 'animals' },
          { t: 'game', kind: 'listen', set: 'animals', title: 'Escucha y toca el animal' }] },
        { npc: 'cow', hint: 'Habla con la vaca 🐮', ev: [
          { t: 'say', en: 'Moo! Moo!', es: '¡Muuu! ¡Muuu!' },
          { t: 'ask', en: '🐮 What is it?', es: '¿Qué es?', opts: ["It's a cow.", "It's a pig.", "It's a horse."], ok: [0] },
          { t: 'lesson', id: 'have' },
          { t: 'ask', en: 'The cow ___ four legs. 🐮', es: 'La vaca tiene cuatro patas.', opts: ['has', 'have', 'is'], ok: [0], why: 'Con he, she, it (y «the cow») se dice <b>has</b>.' },
          { t: 'ask', en: 'I ___ a rabbit. 🐰', es: 'Tengo un conejo.', opts: ['have', 'has', 'am'], ok: [0] }] },
        { npc: 'dog', hint: 'Dale el hueso al perro 🐶', ev: [
          { t: 'say', en: 'Woof! Woof! Is that a bone for me?', es: '¡Guau! ¡Guau! ¿Es un hueso para mí?' },
          { t: 'ask', en: 'Qué le dices al darle el hueso 🦴', es: '', opts: ['Here you are!', 'Goodbye, bone!', 'I am a bone.'], ok: [0] },
          { t: 'game', kind: 'spell', set: 'animals', title: 'Escribe el nombre del animal' },
          { t: 'build', es: 'El pato tiene dos patas.', en: 'The duck has two legs' }] },
        { npc: 'farmer', hint: 'Vuelve con el granjero 👨‍🌾', ev: [
          { t: 'ask', en: 'How many legs has a chicken got? 🐔', es: '¿Cuántas patas tiene una gallina?', opts: ['Two.', 'Four.', 'Six.'], ok: [0] },
          { t: 'say', en: 'Thank you! Take this map of the town.', es: '¡Gracias! Toma este mapa de la ciudad.' },
          { t: 'give', e: '🗺️', en: 'a map', es: 'un mapa' }] }],
      review: [
        { en: '🐷 What is it?', es: '¿Qué es?', opts: ["It's a pig.", "It's a dog.", "It's a duck."], ok: [0] },
        { en: 'She ___ a horse. 🐴', es: 'Ella tiene un caballo.', opts: ['has', 'have', 'is'], ok: [0] },
        { en: 'We ___ two cats. 🐱🐱', es: 'Tenemos dos gatos.', opts: ['have', 'has', 'are'], ok: [0] },
        { en: '🐑🐑🐑 What are they?', es: '¿Qué son?', opts: ['They are sheep.', 'They are sheeps.', "It's a sheep."], ok: [0] }] },

    { id: 'town', name: 'Busy Town', es: 'La ciudad', pos: [0, 1], ground: '#cfd8dc', path: '#eceff1', land: '🏥', deco: ['🚦', '🌳', '🚲', '🏪'],
      npcs: [{ id: 'police', e: '👮', name: 'Officer Kim', at: [5, 3] }, { id: 'emma', e: '👧🏼', name: 'Emma', at: [2, 6] }, { id: 'lostcat', e: '🐈', name: 'Whiskers', at: [8, 2] }],
      lessons: ['where'],
      steps: [
        { npc: 'emma', hint: 'Emma 👧🏼 está llorando: habla con ella', ev: [
          { t: 'say', en: 'Oh no! My cat is lost! Can you help me?', es: '¡Oh, no! ¡Se ha perdido mi gato! ¿Me ayudas?' },
          { t: 'ask', en: 'Can you help me?', es: '¿Me ayudas?', opts: ['Yes, I can!', 'Yes, I do!', 'Yes, I am!'], ok: [0] },
          { t: 'say', en: 'Ask the police officer, please!', es: '¡Pregúntale a la policía, por favor!' }] },
        { npc: 'police', hint: 'Pregunta a la policía 👮', ev: [
          { t: 'lesson', id: 'where' },
          { t: 'ask', en: '¿Cómo preguntas por el gato?', es: '', opts: ['Where is the cat?', 'What is the cat?', 'How is the cat?'], ok: [0] },
          { t: 'say', en: 'I saw the cat! It was in a box. 🐱📦', es: '¡He visto al gato! Estaba dentro de una caja.' },
          { t: 'ask', en: '🐱📦 Where is the cat?', es: '¿Dónde está el gato?', opts: ["It's in the box.", "It's on the box.", "It's under the box."], ok: [0] },
          { t: 'ask', en: '⚽ under 🛏️ Where is the ball?', es: '¿Dónde está la pelota?', opts: ["It's under the bed.", "It's on the bed.", "It's in the bed."], ok: [0] },
          { t: 'game', kind: 'pairs', set: 'preps', title: 'Une cada dibujo con su palabra' }] },
        { npc: 'lostcat', hint: 'Busca al gato 🐈 en la esquina de la ciudad', ev: [
          { t: 'say', en: 'Meow! I am next to the tree!', es: '¡Miau! ¡Estoy al lado del árbol!' },
          { t: 'ask', en: '🐈🌳 Where is the cat now?', es: '¿Dónde está el gato ahora?', opts: ["It's next to the tree.", "It's in the tree.", "It's under the tree."], ok: [0] },
          { t: 'build', es: 'El gato está en la caja.', en: 'The cat is in the box' }] },
        { npc: 'emma', hint: 'Lleva la noticia a Emma 👧🏼', ev: [
          { t: 'ask', en: 'Where is my cat?', es: '¿Dónde está mi gato?', opts: ["It's next to the tree!", "It's a cat!", "It's red!"], ok: [0] },
          { t: 'say', en: 'Thank you, {name}! Here is my whistle for the sports field.', es: '¡Gracias, {name}! Aquí tienes mi silbato para el campo de deportes.' },
          { t: 'give', e: '📯', en: 'a whistle', es: 'un silbato' }] }],
      review: [
        { en: '📚 on 🪑 Where are the books?', es: '¿Dónde están los libros?', opts: ['They are on the chair.', 'They are in the chair.', 'They is on the chair.'], ok: [0] },
        { en: 'Where is the school? 🏫', es: '¿Dónde está el colegio?', opts: ["It's next to the park.", "It's a park.", 'Yes, it is.'], ok: [0] },
        { en: '🐶 behind 🏠 Where is the dog?', es: '¿Dónde está el perro?', opts: ["It's behind the house.", "It's in the house.", "It's on the house."], ok: [0] },
        { en: '¿Cómo se dice «debajo de»?', es: '', opts: ['under', 'on', 'next to'], ok: [0] }] },

    { id: 'sports', name: 'Sports Park', es: 'El polideportivo', pos: [0, 0], ground: '#81c784', path: '#e8d6a8', land: '🏟️', deco: ['⚽', '🏀', '🎾', '🏅'],
      npcs: [{ id: 'coach', e: '🧑‍🦱', name: 'Coach Max', at: [5, 3] }, { id: 'penguin', e: '🐧', name: 'Pingu', at: [2, 5] }, { id: 'bird', e: '🐦', name: 'Tweety', at: [7, 5] }],
      lessons: ['can'],
      steps: [
        { npc: 'coach', hint: 'Habla con el entrenador 🧑‍🦱', ev: [
          { t: 'say', en: "Hi, {name}! Let's do some sport!", es: '¡Hola, {name}! ¡Vamos a hacer deporte!' },
          { t: 'game', kind: 'listen', set: 'actions', title: 'Escucha y toca la acción' },
          { t: 'lesson', id: 'can' },
          { t: 'ask', en: 'Can you swim? 🏊', es: '¿Sabes nadar?', opts: ['Yes, I can.', "No, I can't.", 'Yes, I do.'], ok: [0, 1], why: 'A «Can you…?» se responde <b>Yes, I can</b> o <b>No, I can\'t</b>.' }] },
        { npc: 'penguin', hint: 'Habla con el pingüino 🐧', ev: [
          { t: 'say', en: "I'm sad. I can swim, but I can't fly.", es: 'Estoy triste. Sé nadar, pero no puedo volar.' },
          { t: 'ask', en: '🐧 Can penguins fly?', es: '¿Los pingüinos pueden volar?', opts: ["No, they can't.", 'Yes, they can.', "No, they don't."], ok: [0] },
          { t: 'ask', en: '🐟 Can fish swim?', es: '¿Los peces saben nadar?', opts: ['Yes, they can.', "No, they can't.", 'Yes, they are.'], ok: [0] },
          { t: 'build', es: 'Los pingüinos saben nadar.', en: 'Penguins can swim' }] },
        { npc: 'bird', hint: 'Habla con el pájaro 🐦', ev: [
          { t: 'say', en: 'I can fly! What can fly? Catch them!', es: '¡Yo sé volar! ¿Qué cosas vuelan? ¡Atrápalas!' },
          { t: 'game', kind: 'rain', goodList: [['🐦', 'bird'], ['✈️', 'plane'], ['🐝', 'bee'], ['🦋', 'butterfly'], ['🦅', 'eagle'], ['🚁', 'helicopter']], badList: [['🐶', 'dog'], ['🐟', 'fish'], ['🐱', 'cat'], ['🚗', 'car'], ['🐢', 'turtle'], ['🐘', 'elephant']], title: 'Atrapa solo lo que PUEDE VOLAR' },
          { t: 'build', es: 'Los pájaros pueden volar.', en: 'Birds can fly' }] },
        { npc: 'coach', hint: 'Vuelve con el entrenador 🧑‍🦱', ev: [
          { t: 'ask', en: 'Can you dance? 💃', es: '¿Sabes bailar?', opts: ['Yes, I can!', "No, I can't.", 'Yes, I dance.'], ok: [0, 1] },
          { t: 'say', en: 'You are a champion! Take this book to the library.', es: '¡Eres un campeón! Lleva este libro a la biblioteca.' },
          { t: 'give', e: '📕', en: 'a book', es: 'un libro' }] }],
      review: [
        { en: '🐟 Can fish fly?', es: '¿Los peces pueden volar?', opts: ["No, they can't.", 'Yes, they can.', "No, they aren't."], ok: [0] },
        { en: '¿Cómo se dice «sé saltar»?', es: '', opts: ['I can jump.', 'I can to jump.', 'I jump can.'], ok: [0] },
        { en: '🐒 Can monkeys climb?', es: '¿Los monos saben trepar?', opts: ['Yes, they can.', "No, they can't.", 'Yes, they do.'], ok: [0] },
        { en: 'He ___ sing very well. 🎤', es: 'Él canta muy bien.', opts: ['can', 'cans', 'can to'], ok: [0] }] },

    { id: 'library', name: 'Cosy Library', es: 'La biblioteca', pos: [1, 0], ground: '#d7ccc8', path: '#efe3cf', land: '📚', deco: ['🛋️', '🕯️', '🪴', '🖼️'],
      npcs: [{ id: 'grandma', e: '👵', name: 'Grandma Ann', at: [5, 3] }, { id: 'chef', e: '👨‍🍳', name: 'Dad', at: [2, 5] }, { id: 'artist', e: '🧒🏾', name: 'Zoe', at: [7, 5] }],
      lessons: ['doing'],
      steps: [
        { npc: 'grandma', hint: 'Habla con la abuela 👵', ev: [
          { t: 'say', en: 'Shh! I am reading. Oh, thank you for the book!', es: '¡Chis! Estoy leyendo. ¡Oh, gracias por el libro!' },
          { t: 'lesson', id: 'doing' },
          { t: 'ask', en: '👵📖 What is Grandma doing?', es: '¿Qué está haciendo la abuela?', opts: ['She is reading.', 'She reading.', 'She reads now.'], ok: [0], why: 'Hace falta <b>is</b> + verbo con <b>-ing</b>: She <b>is reading</b>.' },
          { t: 'game', kind: 'pairs', set: 'ing', title: 'Une cada dibujo con lo que está haciendo' }] },
        { npc: 'chef', hint: 'Habla con papá 👨‍🍳', ev: [
          { t: 'say', en: "I'm cooking pizza for dinner!", es: '¡Estoy cocinando pizza para cenar!' },
          { t: 'ask', en: '👨‍🍳 What is Dad doing?', es: '¿Qué está haciendo papá?', opts: ['He is cooking.', 'He are cooking.', 'He cooking.'], ok: [0] },
          { t: 'build', es: 'Estoy comiendo pizza.', en: 'I am eating pizza' }] },
        { npc: 'artist', hint: 'Habla con Zoe 🧒🏾', ev: [
          { t: 'ask', en: 'Zoe tiene pinceles 🎨. ¿Qué le preguntas?', es: '', opts: ['What are you doing?', 'What is you doing?', 'Where are you doing?'], ok: [0] },
          { t: 'say', en: "I'm painting a dragon! The dragon is in the castle.", es: '¡Estoy pintando un dragón! El dragón está en el castillo.' },
          { t: 'ask', en: '⚽👦👦 What are they doing?', es: '¿Qué están haciendo?', opts: ['They are playing football.', 'They is playing football.', 'They playing football.'], ok: [0] },
          { t: 'build', es: 'Están jugando al fútbol.', en: 'They are playing football' }] },
        { npc: 'grandma', hint: 'Vuelve con la abuela 👵', ev: [
          { t: 'say', en: 'The dragon is hungry and angry! Only English can stop it. Take this magic wand.', es: '¡El dragón tiene hambre y está enfadado! Solo el inglés puede pararlo. Toma esta varita mágica.' },
          { t: 'give', e: '🪄', en: 'a magic wand', es: 'una varita mágica' }] }],
      review: [
        { en: '😴🐱 What is the cat doing?', es: '¿Qué está haciendo el gato?', opts: ['It is sleeping.', 'It sleeping.', 'It are sleeping.'], ok: [0] },
        { en: '¿Cómo se dice «estoy cantando»?', es: '', opts: ["I'm singing.", 'I singing.', 'I am sing.'], ok: [0] },
        { en: 'We ___ playing. ⚽', es: 'Estamos jugando.', opts: ['are', 'is', 'am'], ok: [0] },
        { en: 'What are you doing? 🍽️', es: '¿Qué estás haciendo?', opts: ["I'm eating.", 'I eat yesterday.', "I'm eat."], ok: [0] }] },

    { id: 'castle', name: 'Dragon Castle', es: 'El castillo del dragón', pos: [2, 0], ground: '#b0bec5', path: '#d5dbe0', land: '🏰', deco: ['🗿', '🔥', '🕯️', '⚔️'],
      npcs: [{ id: 'wizard', e: '🧙', name: 'Merlin', at: [3, 4] }, { id: 'dragon', e: '🐉', name: 'The Dragon', at: [6, 3], boss: true }],
      lessons: ['past'],
      steps: [
        { npc: 'wizard', hint: 'Habla con el mago 🧙', ev: [
          { t: 'say', en: 'Welcome, {name}! To beat the dragon, you need the past.', es: '¡Bienvenido, {name}! Para vencer al dragón necesitas el pasado.' },
          { t: 'lesson', id: 'past' },
          { t: 'ask', en: 'Yesterday I ___ football. ⚽', es: 'Ayer jugué al fútbol.', opts: ['played', 'play', 'playing'], ok: [0] },
          { t: 'ask', en: 'Yesterday I ___ to the beach. 🏖️', es: 'Ayer fui a la playa.', opts: ['went', 'go', 'goed'], ok: [0], why: '<b>go</b> es irregular: en pasado es <b>went</b>.' },
          { t: 'ask', en: 'What did you do yesterday?', es: '¿Qué hiciste ayer?', opts: ['I visited my grandma.', 'I visit my grandma tomorrow.', 'I am visit my grandma.'], ok: [0] },
          { t: 'game', kind: 'pairs', set: 'past', title: 'Une cada dibujo con el verbo en pasado' }] },
        { npc: 'dragon', hint: '¡Enfréntate al dragón 🐉!', ev: [
          { t: 'say', en: 'ROAR! Who are you? Answer my questions or go away!', es: '¡GRRR! ¿Quién eres? ¡Responde a mis preguntas o vete!' },
          { t: 'boss' }] }],
      review: [
        { en: 'Yesterday I ___ an apple. 🍎', es: 'Ayer me comí una manzana.', opts: ['ate', 'eated', 'eat'], ok: [0] },
        { en: 'Did you play yesterday?', es: '¿Jugaste ayer?', opts: ['Yes, I did.', 'Yes, I played yesterday play.', 'Yes, I do.'], ok: [0] },
        { en: 'Last night I ___ TV. 📺', es: 'Anoche vi la tele.', opts: ['watched', 'watch', 'watching'], ok: [0] },
        { en: 'I ___ a dragon yesterday! 🐉', es: '¡Ayer vi un dragón!', opts: ['saw', 'see', 'seed'], ok: [0] }] },
  ];
  return { V, L, Z };
})();
