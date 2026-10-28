/* Contenido de los vídeos de retos de ortografía (video-retos.html?pack=ortografia / spelling).
   Cada línea: correcta|mal1|mal2|mal3|regla. Las incorrectas no son palabras de verdad (se han evitado parejas reales
   como vaca/baca, hierba/hierva o callé/calle). Van más o menos de más fácil a más difícil. */
window.VR_DATOS = {
  ortografia: `
hacer|aser|haser|acer|Hacer se escribe con h y con c.
hoja|oja|hoga|hoxa|Hoja lleva h al principio y j.
helado|elado|jelado|heladdo|Helado lleva h al principio (como hielo).
hielo|yelo|ielo|hyelo|Las palabras que empiezan por hie- llevan h: hielo, hierro, hiena.
huevo|uevo|huebo|guevo|Las palabras que empiezan por hue- llevan h: huevo, hueso, huella.
hormiga|ormiga|hormija|hormigha|Las palabras que empiezan por hor- suelen llevar h: hormiga, horno, hora.
humano|umano|jumano|hummano|Las palabras que empiezan por hum- llevan h: humano, humo, húmedo.
hombre|ombre|honbre|hombrre|Hombre lleva h, y antes de b se escribe m.
llave|yave|llabe|yabe|Llave se escribe con ll y con v.
lluvia|yuvia|llubia|yubia|Lluvia se escribe con ll y con v (como llover).
llover|yover|llober|yober|Llover: ll al principio y v (como lluvia).
payaso|pallaso|payazo|payasso|Payaso lleva y, y s al final.
ayer|aller|hayer|ayerr|Ayer se escribe con y, sin h.
yogur|llogur|iogur|yogurh|Yogur se escribe con y al principio.
zapato|sapato|capato|zapatto|Za, zo, zu se escriben con z: zapato, zorro, zumo.
cereza|sereza|zereza|cerreza|Ce y ci se escriben con c: cereza, cielo. Al final, za con z.
cielo|zielo|sielo|cyelo|Ce y ci se escriben con c (casi nunca con z).
nariz|naris|narís|narriz|Nariz acaba en z: su plural es narices.
peces|pezes|pecez|pesces|El plural de las palabras en z se hace con -ces: pez → peces.
lápices|lápizes|lápises|lapízes|Lápiz → lápices: la z cambia a c delante de e. Y es esdrújula: lleva tilde.
bombilla|bonbilla|vombilla|bombiya|Antes de b siempre se escribe m: bombilla, hombro, tambor.
cambio|canbio|camvio|kambio|Antes de b se escribe m: cambio, tambor, hombre.
tiempo|tienpo|thiempo|tiemppo|Antes de p siempre se escribe m: tiempo, campo, siempre.
también|tamvién|tanbién|tambien|Antes de b, m. Y es aguda acabada en n: lleva tilde.
invierno|imbierno|imvierno|inbierno|Antes de v siempre se escribe n: invierno, enviar, invitar.
enviar|embiar|emviar|enbiar|Antes de v siempre se escribe n (nunca m).
invitación|imbitación|invitasión|imvitación|Antes de v, n. Y -ción con c (invitar → invitación).
inmenso|immenso|imenso|inmmenso|In- + menso: se escribe nm (inmenso, inmóvil).
abuelo|avuelo|habuelo|abuello|Abuelo se escribe con b y sin h.
bicicleta|vicicleta|bisicleta|bicikleta|Bi- (dos) se escribe con b: bicicleta, bisabuelo, bilingüe.
bisabuelo|visabuelo|bisavuelo|visavuelo|Bis- (dos veces) se escribe con b, igual que abuelo.
escribir|escrivir|escrebir|eskribir|Los verbos que acaban en -bir se escriben con b (salvo hervir, servir y vivir).
recibir|recivir|resibir|rezibir|Los verbos en -bir llevan b: recibir, escribir, subir.
vivir|bivir|vibir|bibir|Vivir es una excepción: los verbos en -bir llevan b, pero vivir va con v.
objeto|ovjeto|obgeto|objecto|Ob- se escribe con b: objeto, obtener, obstáculo.
obvio|ovbio|ovio|obbio|Ob- se escribe con b: obvio, objeto, obstáculo.
absurdo|avsurdo|apsurdo|absurdoh|Ab- se escribe con b: absurdo, abstracto, absoluto.
subrayar|suvrayar|subrallar|surrayar|Sub- se escribe con b: subrayar, submarino, subir.
viaje|viage|biaje|viajje|Las palabras que acaban en -aje se escriben con j: viaje, garaje, equipaje.
garaje|garage|garague|garraje|Las palabras en -aje llevan j: garaje, viaje, paisaje.
equipaje|equipage|ekipaje|equipaxe|Las palabras en -aje llevan j: equipaje, viaje, garaje.
trabajo|trabago|travajo|trabaho|Trabajo se escribe con b y con j.
jirafa|girafa|jiraffa|jirrafa|Jirafa va con j: es una de las pocas palabras con ji- que no van con g.
reloj|relog|reloh|relox|Reloj acaba en j (su plural es relojes).
gente|jente|guente|gentte|Las palabras con gen- se escriben con g: gente, general, generoso.
girasol|jirasol|guirasol|girasoll|Girasol: gira + sol, con g.
mágico|májico|magico|mágiko|Mágico va con g, y es esdrújula: siempre lleva tilde.
colegio|colejio|colegío|colejío|Las palabras que acaban en -gio se escriben con g: colegio, regio.
jabón|javón|gabón|xabón|Jabón se escribe con j y b, y lleva tilde (aguda acabada en n).
árbol|arbol|arból|árból|Árbol es llana y acaba en l (no en n, s o vocal): lleva tilde.
camión|camion|cámion|camíon|Camión es aguda acabada en n: lleva tilde.
lápiz|lapiz|lapíz|lápis|Lápiz es llana acabada en z: lleva tilde.
avión|abión|avion|ávion|Avión: con v, y aguda acabada en n con tilde.
fácil|facil|fásil|facíl|Fácil es llana acabada en l: lleva tilde.
difícil|dificil|difisil|díficil|Difícil es llana acabada en l: lleva tilde en la í.
después|despues|despúes|despuès|Después es aguda acabada en s: lleva tilde.
murciélago|murcielago|murcíelago|murciélagho|Murciélago es esdrújula: las esdrújulas siempre llevan tilde.
teléfono|telefono|teléfeno|telèfono|Teléfono es esdrújula: siempre lleva tilde.
examen|exámen|exsamen|egzamen|Examen es llana acabada en n: NO lleva tilde.
exámenes|examenes|exámenez|exsámenes|Exámenes es esdrújula: siempre lleva tilde (aunque examen no).
joven|jóven|joben|hoven|Joven es llana acabada en n: no lleva tilde. Y va con v.
jóvenes|jovenes|jóbenes|jovénes|Jóvenes es esdrújula: lleva tilde (aunque joven no).
pingüino|pinguino|pingüíno|pinwino|Pingüino lleva diéresis (ü) para que suene la u.
cigüeña|ciguena|cigueña|sigüeña|Cigüeña lleva diéresis (ü) para que suene la u, y ce/ci con c.
vergüenza|verguenza|bergüenza|vergüensa|Vergüenza lleva diéresis (ü) para que suene la u.
zanahoria|zanaoria|sanahoria|zanahória|Zanahoria lleva una h en medio, aunque no suene.
almohada|almoada|almojada|almohadda|Almohada lleva una h en medio, aunque no suene.
búho|buho|búo|bújo|Búho lleva h en medio y tilde en la ú (hiato).
prohibido|proibido|prohivido|prohíbido|Prohibido lleva h en medio y b.
vehículo|vehiculo|veículo|bheículo|Vehículo lleva h en medio y tilde (es esdrújula).
exhausto|exausto|exsausto|ehxausto|Exhausto lleva h después de la x, aunque no suene.
excepción|exepción|escepción|excepsión|Excepción se escribe con xc y con -ción.
extraño|estraño|exstraño|ectraño|Extra- se escribe con x: extraño, extranjero, extraordinario.
expresión|espresión|exprezión|expreción|Expresión se escribe con x (de expresar) y con -sión.
acción|ación|acsión|axión|Si en la familia hay -ct- (acto, actor), se escribe -cción: acción.
dirección|direción|direcsión|direxión|Director, directo… llevan -ct-, así que dirección va con -cc-.
conexión|conección|conesión|coneción|Conexión va con x, aunque venga de conectar: es una excepción.
ocasión|occasión|ocación|ocasion|Ocasión: una sola c, -sión con s y tilde.
a veces|aveces|a beces|haveces|A veces se escribe separado (como a menudo).
de repente|derrepente|derepente|de rrepente|De repente se escribe separado, y con una sola r.
sin embargo|sinembargo|sin envargo|sin emvargo|Sin embargo: separado, y m antes de b.
a lo mejor|alomejor|a lo megor|alo mejor|A lo mejor se escribe en tres palabras.
por favor|porfavor|por fabor|porfabor|Por favor: separado y con v.
`,
  spelling: `
friend|freind|frend|friendd|"i before e": friend has "ie" after the r.
believe|beleive|belive|beleave|"i before e, except after c": believe.
until|untill|untile|antil|Until has only one l at the end (but "till" has two).
truly|truely|truley|truily|True loses its e: true → truly.
across|accross|acros|accros|Across has one c and two s.
address|adress|addres|adres|Address has double d and double s.
tomorrow|tommorow|tomorow|tommorrow|Tomorrow: one m, double r.
beginning|begining|beggining|beginnig|Begin → beginning: the n doubles before -ing.
weird|wierd|weerd|wierde|Weird breaks the "i before e" rule: it's "ei".
receive|recieve|receeve|receve|"i before e, except after c": receive.
piece|peice|piese|peece|"i before e": a piece of pie.
calendar|calender|calandar|callendar|Calendar ends in -ar, not -er.
library|libary|liberry|librery|Library has an r after the b: li-BRA-ry.
February|Febuary|Febrary|Feburary|February has an r after the b: Feb-RU-ary.
Wednesday|Wensday|Wednsday|Wedensday|Wednesday keeps the silent d: Wed-nes-day.
separate|seperate|separete|sepparate|There's "a rat" in sep-A-RAT-e.
definitely|definately|definitly|defenitely|Definitely comes from "finite": de-FINITE-ly.
necessary|neccessary|necessery|neccesary|One collar, two sleeves: one c, two s.
surprise|suprise|surprize|surprice|Surprise has an r after the u: SUR-prise.
business|buisness|bussiness|busness|Business comes from busy: bus-I-ness.
argument|arguement|argumant|arguemant|Argue loses its e: argue → argument.
grateful|greatful|gratefull|graitful|Grateful has nothing to do with "great": grate-ful.
restaurant|restaraunt|resturant|restuarant|Restaurant: rest-AU-rant.
government|goverment|govermint|governmant|Govern + ment: don't forget the n.
environment|enviroment|environmant|envirnment|Environ + ment: don't forget the n.
embarrass|embarass|embarras|embaress|Embarrass has double r and double s.
accommodate|accomodate|acommodate|acomodate|Accommodate has double c and double m.
occurrence|occurence|ocurrence|occurrance|Occurrence: double c, double r and -ence.
occasion|ocassion|occassion|ocasion|Occasion: double c, single s.
recommend|reccomend|recomend|reccommend|Recommend: one c, double m.
successful|succesful|sucessful|successfull|Successful: double c, double s, one l.
immediately|immediatly|imediately|immediatley|Immediate + ly: keep the e.
independent|independant|indipendent|independint|Independent ends in -ent, not -ant.
existence|existance|existense|exsistence|Existence ends in -ence.
knowledge|knowlege|knowladge|knoledge|Know + ledge: knowledge.
schedule|schedual|shedule|scedule|Schedule: sch- and -dule.
conscious|concious|consious|conscius|Conscious has "sc" in the middle: con-SC-ious.
privilege|priviledge|privelege|privilage|Privilege has no d: pri-vi-lege.
foreign|foriegn|foreing|forein|Foreign breaks the "i before e" rule: for-EIGN.
harass|harrass|harras|haress|Harass has one r and double s.
committee|commitee|comittee|committe|Committee: double m, double t, double e.
disappear|dissapear|disapear|dissappear|Dis + appear: one s, double p.
noticeable|noticable|noticeble|notisable|Notice + able: keep the e.
publicly|publically|publicaly|publicley|Publicly is one of the few -ic words that takes just -ly.
apparent|apparant|aparent|apparrent|Apparent: double p, one r, -ent.
maintenance|maintainance|maintenence|maintenanse|Maintain → mainTENance.
millennium|millenium|milennium|millenniun|Millennium: double l and double n.
possession|posession|possesion|posesion|Possession has two pairs of double s.
rhythm|rythm|rhythym|rhytm|Rhythm Helps Your Two Hips Move.
twelfth|twelth|twelvth|tweltfh|Twelfth keeps the f: twel-F-th.
vacuum|vaccum|vacum|vaccuum|Vacuum has one c and double u.
`,
};
