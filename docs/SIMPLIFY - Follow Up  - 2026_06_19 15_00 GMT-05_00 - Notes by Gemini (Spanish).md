# 📝 Las notas

jun 19, 2026

## SIMPLIFY \- Follow Up 

Invitado [Alfredo Sotil](mailto:alfredo.sotil@ibudi.dev) [Juan Jose Mariategui](mailto:juanjose.mariategui@ibudi.dev) [angel.heyen@simplify.com.pe](mailto:angel.heyen@simplify.com.pe) [Jean Paul Sotil](mailto:jean.sotil@ibudi.dev)

Archivos adjuntos [SIMPLIFY - Follow Up ](https://calendar.google.com/calendar/event?eid=MzlpdmpyNGs5YW05MjZudThhbG5sZWt0bm4ganVhbmpvc2UubWFyaWF0ZWd1aUBpYnVkaS5kZXY)

Registros de la reunión [Transcripción](https://docs.google.com/document/d/1OC_2Jelpq-ASZ0PKwEjd0aHVDyXgZS4hjdex1NoledM/edit?usp=drive_web&tab=t.5q0yujmts5gm) [Grabación](https://drive.google.com/file/d/1chW3V05SnAzhlWuijejYj8SkiRH3v0hD/view?usp=drive_web) [Notas de Gemini (Inglés)](https://docs.google.com/document/d/16KsOSGRbFwLCCBl7C7r2sO3krfmhaLdkHOqGbGw4xSY/edit?usp=meet_tnfm_email) 

### Resumen

La reunión presentó la prueba de concepto y definió la estrategia de inteligencia artificial para gestión documental.

**Presentación de prueba concepto**  
Se expuso una plataforma para gestionar especificaciones técnicas y matrices de cumplimiento mediante acceso seguro. La prioridad se centró en validar funcionalidades técnicas sobre aspectos visuales.

**Optimización de búsqueda inteligente**  
El sistema emplea bases de datos vectoriales para indexar documentos y localizar requerimientos específicos con precisión. Se decidió utilizar inteligencia artificial para organizar expedientes desordenados automáticamente, omitiendo el procesamiento manual.

**Cumplimiento técnico y evidencias**  
Los estándares de aprobación requieren validación estricta y uso de documentos actualizados. Se discutió integrar tablas de requerimientos faltantes y adjuntar evidencias para consolidar archivos finales de forma eficiente.

### Próximos pasos

- [ ] \[Alfredo Sotil\] Ajustar formato PDF: Modificar la estructura de los PDFs anotados para incluir el número de página y la ubicación exacta del punto encontrado en la carpeta digital.

- [ ] \[Angel Heyen\] Enviar PDF desordenado: Proporcionar el archivo PDF del sistema de Santa Rosa que presenta desorden en los títulos para permitir pruebas de indexación.

- [ ] \[Angel Heyen\] Validar análisis: Revisar los resultados generados por el sistema para identificar errores y proponer mejoras en la precisión de los análisis.

- [ ] \[Alfredo Sotil\] Evaluar integración: Analizar la viabilidad de integrar una función para buscar documentos técnicos en fuentes externas o proveedores dentro del módulo de documentos de la plataforma.

- [ ] \[Jean Paul Sotil\] Desarrollar funcionalidades: Desarrollar una tabla para visualizar los requerimientos no encontrados y habilitar la opción de adjuntar cartas de sustento previas a cada requerimiento en el sistema.

- [ ] \[Angel Heyen\] Realizar prueba: Realizar una prueba real del aplicativo, incluyendo el análisis de documentos y la revisión de los resultados para identificar posibles errores o mejoras.

- [ ] \[Alfredo Sotil\] Entregar aplicacion: Entregar la aplicación a Angel Heyen para que pueda realizar la prueba, explorar sus funciones y validar los resultados del análisis.

### Detalles

* **Introducción y Funcionalidades de Acceso**: Alfredo Sotil presentó la prueba de concepto de la aplicación, destacando la implementación de un mecanismo de acceso seguro mediante correo electrónico y contraseña. La plataforma incluye soporte para tres idiomas (inglés, español y portugués) y permite la gestión de roles, donde el administrador puede visualizar todos los proyectos y análisis, mientras que otros usuarios acceden únicamente a los proyectos en los que trabajan ([00:00:02](#00:00:02)). Juan Jose Mariategui enfatizó que la prioridad actual de la prueba es validar la funcionalidad y la capacidad de resolución de problemas, más allá del aspecto visual ([00:01:35](#00:01:35)).

* **Biblioteca de Documentos y Especificaciones Técnicas**: Se explicó que la sección de documentos funciona como una biblioteca centralizada para la gestión de archivos ([00:03:07](#00:03:07)). Durante la revisión, se aclaró la diferencia entre las especificaciones técnicas (ETT), que sirven como documento base de requerimientos, y el cuadro de cumplimiento, que es el formato Excel utilizado para validar dichos requerimientos. Angel Heyen detalló que el proceso habitual implica extraer información de PDFs de especificaciones técnicas para integrarla en cuadros de cumplimiento ([00:05:08](#00:05:08)).

* **Gestión de Documentos y Búsqueda Semántica**: Alfredo Sotil demostró las herramientas de carga, filtrado por tipo (hardware, software, ETT) y eliminación de documentos ([00:06:38](#00:06:38)). A pesar de dificultades técnicas menores con el visor de PDF, se destacó la función de búsqueda semántica, la cual utiliza inteligencia artificial para identificar requerimientos específicos entre múltiples documentos, permitiendo ajustar los niveles de precisión según la necesidad del usuario ([00:08:40](#00:08:40)).

* **Tecnología de Indexación y Búsqueda**: Jean Paul Sotil detalló que la plataforma emplea inteligencia artificial y una base de datos vectorizada (PostgreSQL) para realizar la indexación y búsqueda. Esta tecnología permite procesar grandes cantidades de información de manera eficiente, lo que garantiza una velocidad de análisis superior en comparación con la búsqueda tradicional de texto ([00:12:35](#00:12:35)).

* **Análisis de Proyectos y Matriz de Cumplimiento**: Alfredo Sotil mostró el panel de control, el cual permite visualizar estados de proyectos (planificación, análisis, desarrollo, despliegue, completado) y métricas relevantes ([00:14:15](#00:14:15)). Al ejecutar el análisis con el documento ETT seleccionado, la aplicación genera una carpeta de archivos PDF anotados y una matriz de cumplimiento en Excel, la cual detalla el estado de los requerimientos y su ubicación; se acordó que el siguiente paso es validar la precisión de estos resultados para mitigar errores ([00:15:55](#00:15:55)).

* **Jerarquía y Alcance de los Proyectos**: Angel Heyen aclaró dudas sobre la estructura de la plataforma, explicando que un proyecto global, como el Hospital de Motupe, puede albergar múltiples sistemas, tales como control de acceso y telepresencia ([00:21:59](#00:21:59)). Alfredo Sotil confirmó que la prueba actual se centró en el Hospital de Motupe y que el sistema permite la creación de nuevos proyectos independientes para otras ubicaciones, permitiendo el ingreso de distintos ETT y análisis por cada uno ([00:23:38](#00:23:38)).

* **Mantenimiento de la Biblioteca de Documentos**: Se discutió la importancia de que los usuarios mantengan una biblioteca de documentos "limpia" y actualizada, ya que el sistema realiza análisis basados exclusivamente en los archivos disponibles. Alfredo Sotil subrayó que la responsabilidad de gestionar las versiones más recientes de los equipos recae en quienes operan la plataforma, evitando así trabajar con especificaciones técnicas obsoletas ([00:26:33](#00:26:33)).

* **Requisitos de Formato para la Matriz de Cumplimiento**: Angel Heyen señaló que el formato actual de la matriz de cumplimiento debe ajustarse para referenciar la "carpeta digital" completa en lugar de archivos individuales ([00:29:58](#00:29:58)) ([00:33:05](#00:33:05)). Se especificó que la matriz debe indicar la página y el punto exacto dentro de la carpeta digital donde se encuentra el sustento del requerimiento, lo cual facilitaría significativamente la labor de supervisión ([00:33:05](#00:33:05)) ([00:35:30](#00:35:30)).

* **Ajustes en el Formato de Salida y Estructura de Documentos**: Tras la retroalimentación de Angel Heyen, Alfredo Sotil reconoció la necesidad de modificar el formato del PDF resultante para que refleje una carpeta digital consolidada. Ambos acordaron que este cambio, junto con el análisis de los títulos en los documentos iniciales, permitirá mejorar la presentación y el cumplimiento de las subpartidas ([00:37:00](#00:37:00)).

* **Manejo de Especificaciones Técnicas Desordenadas**: Angel Heyen planteó el desafío de trabajar con expedientes desordenados, como en el caso del proyecto Santa Rosa, donde los requerimientos no siguen una estructura clara ([00:42:07](#00:42:07)). Alfredo Sotil sugirió que, en lugar de realizar un trabajo manual para ordenar los documentos, la inteligencia artificial podría ser capaz de organizar y procesar estos archivos, por lo que acordaron realizar pruebas con dichos documentos desordenados para verificar esta capacidad ([00:43:38](#00:43:38)).

* **Integración de Fichas Técnicas y Futuras Funcionalidades**: Misael Portilla Cortez sugirió que el sistema podría integrar la búsqueda automática de las fichas técnicas (datasheets) una vez identificados los requerimientos ([00:49:28](#00:49:28)) ([00:54:42](#00:54:42)). Jean Paul Sotil y Alfredo Sotil concluyeron que, aunque la prueba de concepto actual se enfoca en el uso de los documentos proporcionados, estas capacidades adicionales de búsqueda externa e integración de fuentes pueden desarrollarse como funcionalidades futuras para adaptar la plataforma a las necesidades operativas del equipo ([00:55:59](#00:55:59)).

* **Aprobación de equipos y cartas de sustento**: Angel Heyen detalla que, al actuar como terceros para el Estado, deben cumplir con altos estándares para la aprobación de equipos, idealmente alcanzando un porcentaje de cumplimiento del 100%. Cuando las especificaciones técnicas no coinciden con las marcas con las que trabajan habitualmente, tales como Hikvision, deben recurrir a una carta de sustento proporcionada por la marca para validar el cumplimiento ante la supervisión ([00:59:17](#00:59:17)). Angel Heyen explica que, si la supervisión rechaza una marca preferida, buscan equipos alternativos que cumplan con los requerimientos técnicos como recurso final ([01:00:56](#01:00:56)).

* **Gestión y reutilización de cartas de sustento**: Alfredo Sotil consulta si las cartas de sustento pueden reutilizarse entre distintos proyectos para evitar solicitarlas nuevamente. Angel Heyen aclara que generalmente solicitan cartas nuevas, ya que las fechas más recientes poseen mayor peso y validez ante la supervisión ([01:00:56](#01:00:56)). Ante esta limitación, Alfredo Sotil propone solicitar cartas sin fecha para que la inteligencia artificial pueda insertarla posteriormente, o utilizarlas como referencia en la búsqueda de soluciones para requerimientos pendientes, a lo cual Angel Heyen confirma que dicha alternativa es viable ([01:02:31](#01:02:31)).

* **Funcionalidades propuestas para el sistema de control**: Jean Paul Sotil sugiere integrar una tabla dentro del flujo de trabajo, posterior a la fase de análisis, que permita visualizar todos los requerimientos que no fueron encontrados. Además, propone añadir una funcionalidad que permita adjuntar cartas de sustento u otra evidencia documental a cada requerimiento no encontrado, generando al finalizar el proyecto un documento en formato PDF consolidado con toda la información necesaria ([01:03:56](#01:03:56)).

* **Próximos pasos y prueba de concepto**: Alfredo Sotil indica que el equipo evaluará la viabilidad de incorporar las sugerencias discutidas dentro de la prueba de concepto actual. Para la próxima semana, Alfredo Sotil coordinará con Juanjo, Polo y el resto del equipo para entregar la aplicación a Angel Heyen, quien realizará una prueba real con el objetivo de analizar los resultados y detectar posibles problemas que requieran mitigación ([01:05:37](#01:05:37)).

*Revisa las notas de Gemini para asegurarte de que sean precisas. [Obtén sugerencias y descubre cómo Gemini toma notas](https://support.google.com/meet/answer/14754931)*

*Cómo es la calidad de **estas notas específicas?** [Responde una breve encuesta](https://google.qualtrics.com/jfe/form/SV_9vK3UZEaIQKKE7A?confid=FhxhFyFYGEEsOUE26Q3bDxIROAIIigIgABgFCA&detailid=standard&screenshot=false) para darnos tu opinión; por ejemplo, cuán útiles te resultaron las notas.*

# 📖 Transcripción

jun 19, 2026

## SIMPLIFY \- Follow Up  \- Transcripción

### 00:00:02 {#00:00:02}

**Alfredo Sotil:** Okay. Avísenme si pueden ver. Este,

**Angel Heyen:** Sí, sí se nota tu pantalla.

**Alfredo Sotil:** sí,

**Angel Heyen:** Mhm.

**Alfredo Sotil:** ya. E vamos a irnos acá. Okay. Ya. Eso es eh esa es la pantalla principal, ¿okay? O sea, hemos puesto un mecanismo de de acceso para para los usuarios. Okay. De a ver quién está ahí. Eh, vamos a admitir a Alejandro Medina. Ya, este, como les decía, bueno, esta es la página de inicio de de lo que sería un poco la app para Simplify. Em, tiene un mecanismo de acceso con correo y y password. Eh, hemos traducido también la página en tres idiomas, en inglés, español y portugués. Hay algunas cositas que afinar, pero son son detalles mínimos. Este, yo creo que igual podemos ver un poco el el avance que tenemos. Voy a

**Juan Jose Mariategui:** Totalmente. Gracias por comentar eso,

**Alfredo Sotil:** loguear.

**Juan Jose Mariategui:** Alfred. Justo para que estén al tanto, chicos, este es como el primer POC. Eh, a nivel visual todavía se puede seguir mejorando.

### 00:01:35 {#00:01:35}

**Juan Jose Mariategui:** Eh, eso lo podemos construir nosotros con el tiempo. Pero lo importante ahorita y sobre todo como lo que quiero que nos enfoquemos es en la funcionalidad, ¿no? ¿En qué también resuelve la cuestión que trajeron a la mesa y sobre todo, Ángel, que que a ti te pareja que esté como bien?

**Alfredo Sotil:** Sí, ahí vamos a necesitar, como te digo, mucha ayuda tuya, de parte tuya, Ángel, para que puedas este validar que los resultados están bien o qué cosas crees están mal. O sea, necesitamos todo ese detalle para seguir puliendo esto, ¿verdad? Entonces, bueno, vamos a ingresar a con mi usuario. Okay. Eh, lo que podemos ver aquí, voy a cambiarlo español mejor. Sí. Lo que podemos ver acá es hemos creado dos proyectos. Yo he estado trabajando sobre este de aquí, que fueron los documentos que recibimos desde el comienzo. E antes de entrar acá les voy a mostrar un poquito cuál sería el work around para empezar a trabajar con estas cosas. Eh, primero creé un una característica de roles. Yo en este caso soy un administrador. Tengo aquí, si me voy a esta pestaña, yo puedo hacer a alguien administrador y lo que me permite ser administrador es de que me permite ver todos los documentos, todos los proyectos y poder hacer análisis de cualquier proyecto, ¿no?

### 00:03:07 {#00:03:07}

**Alfredo Sotil:** O sea, la idea es de que si hay un usuario que no es administrador, solamente va a poder visualizar sus proyectos o los proyectos que está trabajando en ese momento, ¿no? Entonces, pueden haber cinco personas y cada uno enfocado a un proyecto y puede haber un administrador que puede acceder a todos los proyectos. ¿Okay? Esto es un proyecto que yo no he creado, lo creó otro usuario. Entonces, yo tengo acceso a ingresar y poder ejecutar los análisis que yo necesito. Okay. Luego tenemos aquí la sección de documentos. En esta sección la idea es de que yo puedo es como una biblioteca de los documentos que voy a trabajar, ¿verdad? Aquí la idea es, a ver, déjame, déjame abrir acá. Vamos a abrir esto aquí. Okay. Ángel. Supongo que esto es el, ¿cuál es el ett? Aquí, por ejemplo, eso dice sistema de telepresencia. ¿Cuál de estos sería el ETT?

**Angel Heyen:** Eh, estás mostrando ahorita la biblioteca de

**Alfredo Sotil:** Ah, perdón,

**Angel Heyen:** documentos.

**Alfredo Sotil:** este, no puedes ver mi pantalla. A ver, un momentito. Déjame, déjame volver a compartir. Hm.

### 00:05:08 {#00:05:08}

**Alfredo Sotil:** Okay, ahí puedes ver toda mi pantalla, ¿no? Ya.

**Angel Heyen:** Sí.

**Alfredo Sotil:** Okay. Te preguntaba que de la parte esta del sistema de telepresencia, que fue otra documentación que me enviaste de otro proyecto, ¿cuál de estos sería el ETT?

**Angel Heyen:** donde dice cuadro de

**Alfredo Sotil:** Eh, no,

**Angel Heyen:** cumplimiento.

**Alfredo Sotil:** pero el el ETT no se supone que es como el digamos el documento de especificaciones.

**Angel Heyen:** Claro. Lo que pasa es que las especific en telepresencia no te las no te las envíe, te las envía en control de acceso.

**Alfredo Sotil:** Ah, okay. Es

**Angel Heyen:** O sea, eh nosotros en un principio tenemos especificaciones técnicas,

**Alfredo Sotil:** esto

**Angel Heyen:** ¿no?, que nos dan en un PDF y luego la pasamos a un Excel, que sería en el cuadro de cumplimiento que está en formato Excel. Entonces, esa sí no te la envié por para el sistema de telepresencia, te la envié para control de acceso. Go\!

**Alfredo Sotil:** ya. Ok. Bueno, porque esto este sistema está pensado para trabajar con un documento ETT, ¿verdad? Para tomar en cuenta eso. Bueno, está bien. Sigamos con con lo que tenemos acá.

### 00:06:38 {#00:06:38}

**Alfredo Sotil:** M, está. Bueno, vamos a hacer una muestra de cómo, por ejemplo, okay, vamos a subir esto. Esto, digamos que estos son los documentos de hardware, ¿okay? Entonces, tengo acá tres diferentes tipos de documentos, el de ETT, el de hardware y el de software, ¿no? Si todos los que voy a subir son hardware, entonces los puedo arrastrar aquí. Okay, todos suben como hardware o puedo venir acá y modificarlo como software, si es que este es software, ¿no? Vamos a subirlos así. Vamos a hacer una pequeña prueba de cómo se sube. Okay, ahí ya subieron los documentos. Son estos que están aquí. Okay. Y acá hay, bueno, tenemos eh diferentes filtros, filtros por grupo o podemos ver todos los documentos o podemos filtrar por nombre, ¿no? Por ejemplo, si escribimos pantalla, localizamos el documento y podemos abrirlo, ¿no? o puedo seleccionar solamente los que son de tipo ETT o los de hardware o los de software. Okay. Eh, podemos también seleccionar alguno que querramos eliminar o seleccionar todos para eliminarlos. Sí. Hm. ¿Qué más? Okay.

### 00:08:40 {#00:08:40}

**Alfredo Sotil:** Otra feature de esta parte es de que podemos ver el documento. Vamos a ingresar aquí. Tenemos eh algunos alguna información sobre el documento. Podemos ver el documento desde aquí. Okay, podemos ver de qué trata el documento. A ver, está cargando que me cargó esto, pero esto no está cargando. A ver, hacer un reload. Por alguna razón está cargando esto. A ver, déjame ver. Bueno, eso está algo raro porque

**Jean Paul Sotil:** Tal vez, tal vez eso, tal vez es el visor eh ahorita del PF lo que puede hacer para ver si realmente está

**Alfredo Sotil:** no

**Jean Paul Sotil:** indexando la información es irte a la parte de la búsqueda por

**Alfredo Sotil:** sí.

**Jean Paul Sotil:** semantic y buscar valores que trae el PDF,

**Alfredo Sotil:** también.

**Jean Paul Sotil:** porque probablemente es el visor lo que no está haciendo,

**Alfredo Sotil:** Okay, déjame ver. Sí, sí, no hay problema. Yo voy a buscar eso. Vamos a copiar esto. A ver,

**Jean Paul Sotil:** No, más bien busca busca una de las líneas que están en la segunda,

**Alfredo Sotil:** vamos a Ya. Sí,

**Jean Paul Sotil:** tercera página.

**Alfredo Sotil:** sí, voy en eso.

### 00:10:42

**Alfredo Sotil:** Sí. Bueno, esta es la parte de los documentos, igual, o sea, podemos visualizar acá los documentos, podemos descargarlos también. A ver, déjame probar esto de aquí. Acá podemos descargar el documento. Aquí tenemos el documento descargado. Y vamos a ver. Y probablemente aquí algo se rompió porque no está cargando, pero en fin, algo que se puede solucionar. Ahora vamos a la búsqueda semántica. La búsqueda semántica es como que una una característica, una funcionalidad para, no sé, si en algún momento ustedes tienen algún algún requerimiento y quieran buscar si lo tienen entre los documentos, entonces pueden venir acá, copy paste y buscar, ¿no? Acá podemos ver que hay coincidencias en el mismo documento. Estamos viendo eh esto es un slider, un slider de precisión. O sea, si yo le bajo la precisión, él va a tratar de encontrar palabras en múltiples documentos, ¿no? Si yo quiero que la precisión sea máxima o mediana, podemos jugar con este parámetro. Ya. Vamos a ver que eso es un texto exacto. Sí. Okay. A ver. E listo. Ahora tenemos la página principal que nos va a entregar ciertas métricas.

### 00:12:35 {#00:12:35}

**Jean Paul Sotil:** No, no. eh para que menciones también digamos un poco sobre el proceso de indexación de los archivos,

**Alfredo Sotil:** Dime

**Jean Paul Sotil:** o sea, la tecnología que se está usando y todo eso también para que ellos entiendan también como lo que hay por detrás de cada búsqueda,

**Alfredo Sotil:** tú puedes

**Jean Paul Sotil:** ¿no?

**Alfredo Sotil:** explica

**Jean Paul Sotil:** Porque se usa se usa la inteligencia artificial para poder hacer estas búsquedas.

**Alfredo Sotil:** lo que hacemos es obtener todo el texto de de los PDFs y lo metemos en una base de datos vectorizada para para poder este digamos eh encontrar diferentes secciones de los PDF, ¿no? Usamos una base de datos postgress, una base de datos super robusta y algo más que quieras agregar.

**Jean Paul Sotil:** No, o sea, la como lo que hace impresionante más bien este tipo de búsquedas es que conseguimos buscar en en una cantidad absurda de de documentos mucha información relacionada a la búsqueda que se está haciendo. e la tecnología nos permite recorrer mucha información con con una simple búsqueda. Entonces, no es lo mismo que estar tal vez como a veces haciendo una búsqueda eh como en como en un texto, no estamos buscando en texto, estamos buscando como Alfredo dijo, como un tipo de tecnología que es vectorizada. es es mucho más rápido el el eh para nosotros poder obtener resultados y también bueno gracias a esto los análisis acaban siendo impresionantemente rápidos.

### 00:14:15 {#00:14:15}

**Alfredo Sotil:** Ya, buenazo. Gracias, Jean Paul. Este, bueno, volviendo a esta parte de aquí, esto es un pequeño panel donde hay ciertas métricas sobre los proyectos que actualmente están dentro de la página, los documentos cargados, los análisis completados y en qué fases se encuentran los proyectos, ¿no? Eso es una parte que ya lo vamos a ver aquí sobre el estado de los proyectos, eh, ¿cuántos documentos de especificaciones tenemos? ¿Cuántas de hardware? ¿Cuántos de som? A ver, vamos a la parte de los proyectos. Entonces, la idea la idea aquí es eh primero voy a eliminar esto. Agregamos aquí un eh un estado para los proyectos, o sea, desde que inician, se planifican, cuando están en la parte de análisis de documentos, cuando ya están en desarrollo, cuando se despliegan. o cuando ya son completados, ¿no? Eh, si yo recargo la página, esto se mantiene guardado. Entonces, eh digamos que estamos en la fase de análisis de documentos. Necesitamos el modelo actualmente ahorita funciona cuando cargamos un ETT. Entonces este adjuntar documentos me va a traer solamente los ETS que tengo que tengo registrados entre los documentos. Pues lo voy a seleccionar, lo agrego y me voy a la parte de abrir análisis.

### 00:15:55 {#00:15:55}

**Alfredo Sotil:** Okay. Este resultado ya está aquí porque yo ya he ejecutado anteriormente un un análisis. Okay, pero vamos a volver a ejecutar el análisis. Eh, voy a seleccionar todos los documentos, aunque aquí debería de ser solamente los documentos que ustedes creen que tengan relación, ¿no? Pero para este caso vamos a seleccionar todos. ¿Y qué más? Y ejecutamos el análisis. Tenemos una consola de log. Si presionamos aquí nos lleva al final. Si lo subimos se mantiene. Si nos lleva el último se mantiene pegado al final. Listo. Ahí vemos que ya generó un resultado. Vamos a descargarlo. Vamos a ver un poco lo que hace, ¿no? Ese lo que tiene es una carpeta con PDFs que han sido anotados. Vamos a verlos. Eh, por ejemplo, aquí vamos a abrir este. En esta parte de acá escribimos qué requerimientos fueron los que se encontraron en los PDFs. Vamos a ver qué ha encontrado esto. Que ha encontrado esto si hay algo más. Más aquí. A ver, vemos que he encontrado este aquí. Acá sale el requerimiento.

### 00:19:10

**Alfredo Sotil:** Aquí encontró otro. Okay. Y a ver, vamos a ver otro más. Aquí vemos que he encontrado estos requerimientos, ¿no? Y y así hay hay varias anotaciones que se hacen en los PDFs. Okay. Vamos a ver la matriz. Vamos a espérate, vamos a eliminar esta otra. Y ese es el Excel que genera. Okay. Lo que hace es anotar los requerimientos y dice si cumple o no cumple. Okay. Los anota por partidas. Aquí sale la partida, sale la descripción del de a qué pertenece, digamos. Eh, dice, "Si cumple, te sale en qué página se encuentra. Y acá hay un resumen de eh los requerimientos encontrados contra el total de requerimientos que tiene el ETT. Entonces este es el resultado hasta ahora lo que necesitamos es que alguien nos pueda ayudar a revisar si realmente está cumpliendo con lo que necesitan y qué cosas deben de ser mejoradas, ¿no? O sea, sobre todo identificar si hay errores para poder este mitigarlos. Y y ese sería como que el siguiente paso para continuar con esta prueba de concepto. O sea, la prueba de concepto, perdón, ya está, ¿verdad?

### 00:21:59 {#00:21:59}

**Alfredo Sotil:** porque ya tenemos como que las conexiones entre las diferentes cosas y lo que sigue ahora es como el afinamiento. Ángel, ¿qué te parece hasta ahora esto?

**Angel Heyen:** Sí, Alfredo, estaba viendo lo tu presentación. Eh, tenía unas ciertas dudas en la parte inicial de de la plataforma que se ha creado, donde indica resumen, el resumen de cuando le das a simplify, me parece.

**Alfredo Sotil:** A verm.

**Angel Heyen:** Ya. Ahí dice total de proyectos dos. Ajá. O sea, ahí como que yo me confundí un poco porque es solamente un proyecto en el que está albergado dos sistemas que se te pasó, que era control de acceso y telepresencia. Así lo manejamos nosotros, ¿no? O sea, porque claro, el que yo te mandé es de un proyecto y este proyecto es el de Motupe, ¿no? El Motupe alberga varios varios sistemas, control de acceso, telepresencia, Pacris y una serie de sistemas, pero tenemos otros proyectos como Cajamarca, Bambarca. ¿Me dejo entender?

**Alfredo Sotil:** Mm.

**Angel Heyen:** Ya.

**Alfredo Sotil:** Pero,

**Angel Heyen:** Entonces,

**Alfredo Sotil:** o sea,

**Angel Heyen:** a

**Alfredo Sotil:** es como que el es como que un proyecto tiene subproyectos o algo

**Angel Heyen:** ver,

### 00:23:38 {#00:23:38}

**Alfredo Sotil:** así. Aló.

**Angel Heyen:** no, no.

**Alfredo Sotil:** Ah.

**Angel Heyen:** Lo que pasa es que es un proyecto eh el proyecto como tal es, por ejemplo, el proyecto del hospital de Motupe, ¿no? En el hospital que hay hay eh tiene un data center, ¿no? Eh, en el data center está un eh una serie de equipos como servidores y entonces ahí lo llaman como sistemas, ¿no? Entonces,

**Alfredo Sotil:** Mhm.

**Angel Heyen:** en este caso, por ejemplo, sería un total de sistemas dos, ¿no? Serían porque lo que tengo entendido es que tú eh has adjuntado a este a esta plataforma lo que es control de acceso y telepresencia. serían si lo lo vemos como sistemas o también podría ser subproyectos,

**Alfredo Sotil:** Sí. A ver,

**Angel Heyen:** podrían

**Alfredo Sotil:** te comento,

**Angel Heyen:** ser.

**Alfredo Sotil:** o sea, el de sistema de telepresencia, yo no solo he trabajado con el el los documentos de Hospital Motupe,

**Angel Heyen:** Ajá, correcto.

**Alfredo Sotil:** nada más. Lo otro era esto de acá, es solo una prueba para mostrar que yo como administrador puedo ver proyectos de otras personas que están en el sistema, pero la prueba que nosotros hemos hecho fue únicamente sobre

**Angel Heyen:** Mhm.

### 00:25:02

**Alfredo Sotil:** Hospital Motupe y los documentos que tú me entregaste inicialmente para este proyecto.

**Angel Heyen:** Mhm.

**Alfredo Sotil:** O sea, si quisieras hacer un análisis, pudieras otro nuevo análisis,

**Angel Heyen:** Ah,

**Alfredo Sotil:** pudieras crear el proyecto de del otro hospital en otra

**Angel Heyen:** ya.

**Alfredo Sotil:** provincia, no sé, y lo pones aquí y ingresas y puedes agregar otro ETT

**Angel Heyen:** Okay.

**Alfredo Sotil:** y agregar otro

**Angel Heyen:** Ah,

**Alfredo Sotil:** análisis.

**Angel Heyen:** okay, okay, okay. Listo. Sí, sí, sí. Okay, ya entendí, entendí, entendí. Ya. Este,

**Alfredo Sotil:** Mm.

**Angel Heyen:** lo otro era que estaba viendo que para que pueda hacer el análisis eh la plataforma que ustedes están haciendo, eh lo que hacen es colocar el PDF de la CT, la que me habías mencionado en un principio.

**Alfredo Sotil:** Claro. Agregamos, asociamos al al proyecto, le asociamos un ETT porque eso es como el requerimiento principal, ¿no? Ese, o sea, el input principal de lo que es el proyecto,

**Angel Heyen:** Aha.

**Alfredo Sotil:** ¿no? ¿Cuáles son los requerimientos de este proyecto? En base a al análisis de este documento se van a obtener cierta cantidad de requerimientos que se han encontrado en ese proyecto y se van a buscar contra todos los documentos que uno elija, ¿verdad?

### 00:26:33 {#00:26:33}

**Alfredo Sotil:** O sea, si yo voy acá y por ejemplo,

**Angel Heyen:** Mhm.

**Alfredo Sotil:** yo sé que para este proyecto, no sé, usamos este, eh, bueno, este, este y este y este, porque como tú ya más o menos conoces el negocio, entonces haces el análisis sobre esos documentos, ¿no? o si no tienes idea, ¿no? De repente escoges todos los documentos que tienen en su biblioteca, ¿no? La idea es de que esta sección de documentos ustedes la puedan llenar con los PDFs actualizados de sus proveedores, ¿no? Las últimas versiones y poder trabajar con digamos con una biblioteca limpia de documentos, ¿no? Porque la idea no es como, no sé, por decirte, tienen este documento y el día de mañana eh les llega una nueva versión conos equipos y y también lo agregan, ¿no?

**Angel Heyen:** Mhm.

**Alfredo Sotil:** Lo que va a hacer es buscar en el antiguo y en el nuevo, ¿no? Cuando debería de ser solamente en la última versión, ¿no? Entonces, esto esto digamos va a ser responsabilidad de quienes usan el el sistema, ¿no?, que puedan tener una biblioteca limpia de documentos, ¿no?, con un formato de repente de nombres para evitar equivocaciones o

**Angel Heyen:** Sí, entiendo.

**Alfredo Sotil:** no.

**Angel Heyen:** Alfredo, y nos mostraste el Excel donde bueno, ahí encuentran los puntos, me parece que también donde lo sustentan, ¿cierto?

### 00:28:21

**Angel Heyen:** Ya, por ejemplo, hasta acá, por lo que yo veo, eh el certificación UL no cuenta eh la marca la con la que nosotros hemos trabajado y eso se tuvo que sustentar con carta. Entonces ahí va bien. Veo que bueno, se se direcciona, pero eh solamente direccionan a la página. Ahora eh han podido desarrollar ahora cuando se adjunta todos los documentos se

**Alfredo Sotil:** Cuando Se apuntan todos los documentos.

**Angel Heyen:** adjuntan todos los documentos.

**Alfredo Sotil:** ¿Cómo cómo sería? Explícame para tomar nota de

**Angel Heyen:** Sí. Eh, a ver, eh,

**Alfredo Sotil:** esto.

**Angel Heyen:** este sistema que estás presentando es el sistema de control de acceso, ¿no? La primera partida está relacionada lo que es la cerradura, la segunda debe ser a un pulsador, si no me equivoco, y la tercera una lectora. Entonces es un conjunto de especificaciones técnicas o de fichas técnicas que va a conformar el sistema de control de acceso.

**Alfredo Sotil:** Hm.

**Angel Heyen:** Entonces nosotros para poder presentar esa supervisión eh lo presentamos el sistema completo. Me parece que yo te envié una carpeta digital de control de acceso donde está adjuntado todos los documentos. No sé si lo podrías visualizar.

**Alfredo Sotil:** A ver, déjame ver.

### 00:29:58 {#00:29:58}

**Alfredo Sotil:** A ver,

**Angel Heyen:** Arriba. No, eso no es es la creo que la que la

**Alfredo Sotil:** esas esa fue la segunda tanda de documentos que me

**Angel Heyen:** seg debe ser la

**Alfredo Sotil:** enviaste. La primera. Sí, lo que pasa que en la primera ya venían su red,

**Angel Heyen:** primera.

**Alfredo Sotil:** por eso no las tomé en cuenta. Déjame ver dónde está. Aquí esta

**Angel Heyen:** Carpeta digital. Ajá. Esa

**Alfredo Sotil:** primera. A ver, déjame ver algo.

**Angel Heyen:** sí.

**Alfredo Sotil:** Es que hay una que viene en español y otra en inglés. Okay.

**Angel Heyen:** Ajá. Entonces, es es por ejemplo el Word Station.

**Alfredo Sotil:** Mhm.

**Angel Heyen:** Y si seguimos bajando,

**Alfredo Sotil:** Aha.

**Angel Heyen:** bajamos, bajamos, bajamos, bajamos más. Más, más, más, más. Ahí está. Subimos un poco. Ah, no, no. Bajamos, bajamos más. Eso es todo. Bajamos. Ahí está.

**Alfredo Sotil:** Okay.

**Angel Heyen:** Esa es la cerradura.

### 00:31:30

**Alfredo Sotil:** Lo que veo aquí es que están hay varios

**Angel Heyen:** Ajá, correcto.

**Alfredo Sotil:** PDFs. Okay, entiendo, entiendo más o menos lo que me quieres decir ahora. Ajá. Carta de sustento. Bueno, no. O sea, debería de haber una un documento que diga carpeta digital donde se adjunten todos los documentos, algo así.

**Angel Heyen:** Ajá, claro,

**Alfredo Sotil:** Ah, okay.

**Angel Heyen:** correcto.

**Alfredo Sotil:** Eso eso no lo tomamos en cuenta. No, no sabíamos,

**Angel Heyen:** O sea,

**Alfredo Sotil:** pero eso es algo en lo que se puede trabajar.

**Angel Heyen:** lo que nosotros hacemos es Sí, lo que nosotros hacemos es ver las especificaciones técnicas que nos que nos están

**Alfredo Sotil:** Claro.

**Angel Heyen:** solicitando. vemos qué equipo es el que calza con lo que nos piden y mientras se va avanzando vamos adjuntando, ¿no? Ficha, ficha uno, ficha dos, ficha tres hasta terminar. Entonces, toda esa carpeta adjuntada de o el conjunto de fichas técnicas de todos de todo el sistema es la que se envía a supervisión

**Alfredo Sotil:** O sea, lo que se envía supervisión es esta carpeta y la matriz de

**Angel Heyen:** e y la matriz de cumplimiento.

**Alfredo Sotil:** cumplimiento.

### 00:33:05 {#00:33:05}

**Angel Heyen:** ¿Correcto? Ajá.

**Alfredo Sotil:** Okay.

**Angel Heyen:** Sí. Mm.

**Alfredo Sotil:** Ok.

**Angel Heyen:** Y por ejemplo, en la matriz de cumplimiento eh que nos mostraste indica solamente la página, ¿no? Pero debería indicarnos el punto. Por ejemplo, ahorita donde estás presentando es la página 37,

**Alfredo Sotil:** Ah, okay.

**Angel Heyen:** ¿no?

**Alfredo Sotil:** Entonces tú dices que esto de acá debería de ser el número de página de la carpeta digital,

**Angel Heyen:** Sí,

**Alfredo Sotil:** no de cada uno de los documentos como

**Angel Heyen:** correcto. Ajá.

**Alfredo Sotil:** estos.

**Angel Heyen:** De la carpeta digital. Entonces, debería indicar página 3 y al costado debería indicar el punto donde se tiene que resaltar, porque si por ejemplo vuelves a la a la a la a la carpeta digital,

**Alfredo Sotil:** Mhm.

**Angel Heyen:** ya bajamos un poquito ahí, ahí está, mira, no nos piden las dimensiones del pulsador, ahí nos indican milímetros y el material con el que está. Entonces, se subraya o se resalta y se indica, ¿no? Uno y dos. Entonces, debería indicar ahí, ¿no? Página 38, 37 en el punto uno o punto dos.

**Alfredo Sotil:** A ver, espérate.

### 00:34:38

**Alfredo Sotil:** ¿Me puedes repetir lo último? Perdón, no te escuché bien. El esto de acá.

**Angel Heyen:** Ajá. Sí. Eh, por ejemplo, en la matriz que tú nos has mostrado indica la página, ¿no? Hagamos un ejemplo.

**Alfredo Sotil:** Ajá.

**Angel Heyen:** Supongamos que la página donde tú nos has mostrado sea página, es la página tres, si no me equivoco,

**Alfredo Sotil:** ¿En cuál?

**Angel Heyen:** ¿no?

**Alfredo Sotil:** ¿Aquí o acá?

**Angel Heyen:** El pulsador. Muéstrame el pulsador. El pulsador de tu matriz.

**Alfredo Sotil:** en la el pulsador.

**Angel Heyen:** De tu matriz. De tu matriz. No.

**Alfredo Sotil:** Eh, eso

**Angel Heyen:** Ajá. ¿En qué hoja es?

**Alfredo Sotil:** te

**Angel Heyen:** A ver. Dale, dale. Ahí. ese sistema cont

**Alfredo Sotil:** acá pulsador dice. ¿Dónde leí pulsador?

**Angel Heyen:** ya debes.

**Alfredo Sotil:** Es pulsador.

**Angel Heyen:** Sí, de sí, es es más abajo. Está la parte última, me

**Alfredo Sotil:** Leí pulsador rápidamente.

**Angel Heyen:** parece.

**Alfredo Sotil:** Pulsador.

### 00:35:30 {#00:35:30}

**Alfredo Sotil:** Pulsador. A ver.

**Angel Heyen:** Ajá. Ahí está. Ya. Entonces, por ejemplo, ahí no está direccionado, dice ahí nos indica, por ejemplo, el la medida que debe que debería de ser montado, ¿no?

**Alfredo Sotil:** Mm.

**Angel Heyen:** Son 10 cm por 5\* 5\. Si si volvemos a la carpeta.

**Alfredo Sotil:** a la carpeta digital.

**Angel Heyen:** Ajá. Ya.

**Alfredo Sotil:** Ajá.

**Angel Heyen:** Esa es la página 38, ¿no?

**Alfredo Sotil:** A ver.

**Angel Heyen:** 38\. Entonces debería en en la matriz debería indicar página 38 eh

**Alfredo Sotil:** Sí.

**Angel Heyen:** el punto uno.

**Alfredo Sotil:** Ah, okay. A ver. Ah, y acá entiendo.

**Angel Heyen:** No.

**Alfredo Sotil:** Ahora entiendo. Tiene más sentido. Okay. Un y por acá tenemos, a ver, déjame ver si creo que por acá teníamos de aquí, ¿no? Entonces, e bueno, es que aquí como no salían los oí sale página punto, entonces sería 37 y coma 1\. Así, ese es el formato.

**Angel Heyen:** Sí, indica la página y el punto en el que se ha encontrado.

### 00:37:00 {#00:37:00}

**Alfredo Sotil:** Okay. Hm, entiendo, entiendo, entiendo. Entonces, o sea, el resultado aquí debería de ser el resultado deberían de ser matriz de cumplimiento y carpeta digital hospital motupe, una cosa así,

**Angel Heyen:** Sí.

**Alfredo Sotil:** ¿no? Y bueno,

**Angel Heyen:** Mm.

**Alfredo Sotil:** entiendo, no deberíamos enviar todos los documentos anotados. Perfecto. Ya, esa es una modificación importante que hay que hacer y se llama el formato para el PDF, ¿no? Voy a analizar cómo es que está construido este PDF inicial. Eh, me refiero como a esta parte, ¿no? A ver.

**Angel Heyen:** Mhm.

**Alfredo Sotil:** Y bueno, déjame ver entonces. Y esta este título grande, o sea, ¿por qué lo ponen aquí?

**Angel Heyen:** Ah, ya. Okay. Lo que pasa es que, por ejemplo, eh, donde está el documento donde dice ETS, especificaciones técnicas,

**Alfredo Sotil:** Mhm.

**Angel Heyen:** eh hay títulos, ¿no? Este, por ejemplo, eh se llama subpartidas, ¿no? Partidas o subpartidas, si tienen los tts ahí. No, ahí no, no va a estar.

**Alfredo Sotil:** Ah, no, no,

### 00:39:00

**Angel Heyen:** Está en la

**Alfredo Sotil:** no lo tengo. Sí, sí, en la primera. Dejo un momentito.

**Angel Heyen:** primera.

**Alfredo Sotil:** Ya lo a ver.

**Angel Heyen:** Ya, más abajo, más abajo. Ya. Ahí, por ejemplo, subimos. Estación de trabajo incluye el lector biométrico para tomar, ¿no? Esa es la estación de trabajo. Luego está lo que es la cerradura.

**Alfredo Sotil:** Pero este título está también en este esta carpeta digital

**Angel Heyen:** en justo quería también

**Alfredo Sotil:** Porque porque qu por eso estaba bajando,

**Angel Heyen:** consultarte.

**Alfredo Sotil:** perdón, creo que si es esto. Sí, por eso estaba bajando como para ver si hay más de esos títulos y como

**Angel Heyen:** Sí hay.

**Alfredo Sotil:** no Ah,

**Angel Heyen:** Sí hay.

**Alfredo Sotil:** bueno, acá está.

**Angel Heyen:** Ahí está.

**Alfredo Sotil:** Okay, okay, sí. Okay. Solamente hay tres,

**Angel Heyen:** Ahí está contacto.

**Alfredo Sotil:** cuatro cco seis Y acá viene al final las cartas de sustento. Okay, okay, okay. Entiendo. Ya, ahora entiendo un poco mejor el el resultado que debe tener esto y el formato de los PDFs.

### 00:40:46

**Angel Heyen:** Mm.

**Alfredo Sotil:** Mm. Ya. Okay, perfecto.

**Angel Heyen:** Ahora sí,

**Alfredo Sotil:** Eso es algo que podemos trabajar

**Angel Heyen:** Alfredo. Ahora, otra cosa, eh,

**Alfredo Sotil:** definitivamente.

**Angel Heyen:** lo que quería preguntarte era, por ejemplo, cuando ustedes van a hacer el análisis de las especificaciones técnicas, lo que hacen es colocar el documento en PDF, ¿cierto?

**Alfredo Sotil:** Exacto. Sí, por ahora todo lo que estamos trabajando son PDFs,

**Angel Heyen:** Y de ahí y de ahí lo convierte a

**Alfredo Sotil:** ¿no?

**Angel Heyen:** Excel.

**Alfredo Sotil:** El el ETT, ¿te te refieres o qué?

**Angel Heyen:** Ajá. De la Ajá. La

**Alfredo Sotil:** O sea,

**Angel Heyen:** matriz.

**Alfredo Sotil:** lo que hace internamente es como que recaba todos los requerimientos, eh, los bueno, a través de una lógica lo que hace es crear la matriz y va poniendo los requerimientos en la matriz, ¿no? Como más o menos así.

**Angel Heyen:** Mhm.

**Alfredo Sotil:** Encuentra todos estos requerimientos para Ah, no, esta no es encuentra todos estos requerimientos para esta partida. y los lista, ¿no? Eh, lo mismo encuentra todos estos requerimientos para esta partida y los lista,

**Angel Heyen:** Claro.

### 00:42:07 {#00:42:07}

**Alfredo Sotil:** ¿no? Y acá encuentra el sustento en las técnicas, en las fichas técnicas.

**Angel Heyen:** Claro, entiendo. Ahora hay este y ustedes podrían también desarrollar, pero de tal manera de no colocar el PDF, sino que colocar eh la matriz ya llenada. ¿Por qué les por qué les digo esto? Lo que pasa es que en algunos proyectos están está

**Alfredo Sotil:** Mhm.

**Angel Heyen:** desordenado, no está así como el que yo le he mandado, ¿no? El proyecto de el hospital de Motupe de cierta forma hay un orden, pero por ejemplo ahora estamos trabajando con el proyecto de Santa Rosa, ¿no? Que es un centro de salud y el expediente o no, o las especificaciones técnicas en PDF. hay mucho desorden, demasiado. Entonces, uno tiene que estar buscando ahí, ay, ya esto es para tal cosa, esto es para tal sistema y lo ordenamos en una matriz. Entonces, si yo, por ejemplo, te paso eh el documento de Santa Rosa, eh va a haber bastantes errores, ¿no? Entonces, si es que por ahí se puede trabajar que nosotros ya tengamos listo el Excel

**Alfredo Sotil:** Pero una pregunta, este, o sea,

**Angel Heyen:** y

**Alfredo Sotil:** lo que tú me dices que lo que está en desorden es el et para Santa Rosa, ¿verdad?

### 00:43:38 {#00:43:38}

**Angel Heyen:** sí,

**Alfredo Sotil:** EseT, ¿quién lo genera?

**Angel Heyen:** el básicamente lo hace el Pronis, así como el estado, porque trabajamos para el Estado, o sea,

**Alfredo Sotil:** Okay.

**Angel Heyen:** hay un proyectista

**Alfredo Sotil:** Okay. Entonces, okay. Entonces, quien entrega el input de esa forma es el proyectista.

**Angel Heyen:** Mhm.

**Alfredo Sotil:** Pero, o sea, hm, o sea, pensaría de que la IA es capaz de ordenar todo eso, pero tendría que ver qué tan desordenado lo envía como para yo eh, ¿me entiendes? Quizás quizás no es necesario que ustedes lo ordenen, sino que la IA lo ordene y trabaje de forma que que sepa cómo organizar el documento,

**Angel Heyen:** Claro.

**Alfredo Sotil:** ¿me entiendes?

**Angel Heyen:** Mm.

**Alfredo Sotil:** Eh, si puedes que quede eso también como un pendiente, enviarme esa ese PDF de eseT desordenado para ver si si podemos trabajar con el PDF, ¿no? Porque lo que yo entiendo es de que tú dices, "Ah, bueno,

**Angel Heyen:** Mhm.

**Alfredo Sotil:** eso está tan desordenado que lo voy a ordenar yo en la matriz y y la matriz se convierte como que en el ETT suplementario o algo así.

**Angel Heyen:** Sí, correcto.

**Alfredo Sotil:** Okay, mira,

**Angel Heyen:** Mhm.

### 00:44:59

**Alfredo Sotil:** e sí entiendo tu punto. Yo creo que algo bueno también sería algo bueno de esto también sería eh tratar de mantener un estándar para para este tipo de flujos, ¿no? a tener eh digamos, o sea, no trabajar con matrices como un ETT, sino ver la forma de seguir trabajando con PDFs que son ETT y a partir de todo ese input crear estas cosas, ¿no? O sea,

**Angel Heyen:** Mhm.

**Alfredo Sotil:** el el estándar debería ser así, ¿no? No que ustedes hagan un retrabajo para ordenar y toda la cuestión, ¿no? Yo pensaría de que la IA es capaz de ordenar eso.

**Angel Heyen:** Claro.

**Alfredo Sotil:** Pensaría que sí. Okay. Por las capacidades que tiene, pero sería, tendríamos que experimentar con ese documento y y ver cuál es el resultado.

**Angel Heyen:** Claro. Está

**Alfredo Sotil:** Y una pregunta para para entender un poquito el desorden que tú dices,

**Angel Heyen:** bien.

**Alfredo Sotil:** más o menos, cómo es que se estructura ese desorden, o sea, como dame un

**Angel Heyen:** Ah,

**Alfredo Sotil:** ejemplo,

**Angel Heyen:** ah, ah. A ver, a ver. Mm. ¿Cómo te

**Alfredo Sotil:** quiero quiero dimensionar qué tipo de desorden

**Angel Heyen:** explico?

### 00:46:24

**Alfredo Sotil:** es.

**Angel Heyen:** Ah, a ver. Podrías ir a donde están las STS de PDF. Ya ahí, por ejemplo, subo desde un principio. Ya si te das cuenta, dice antena de antena aérea externa, ¿cierto? Ese es de otro sistema.

**Alfredo Sotil:** Mhm.

**Angel Heyen:** Ese es del sistema de de TVP. Entonces, supongamos que todo esto es este el sistema de de televisión IPTV y abajo sigue sigue abajo abajo abajo. Ya. Acá sigue el sistema de televisión IPTV y nuevamente en la otra combinaron con lo que es este tuberías, tubería MT PVC que no tiene nada que ver con lo que es televisión IPTV. Y nuevamente tiene como que una partida del sistema de televisión IPTV y nuevamente le ponen otra otra otro sistema que no tiene nada que ver. Algo algo así me me pasó que hace poco lo vi. De todas maneras igual yo te te

**Alfredo Sotil:** Pero, o sea,

**Angel Heyen:** mando

**Alfredo Sotil:** lo que tú me dices es de que aquí pueden, o sea, en un ETT que ellos te entregan, pueden haber requerimientos

**Angel Heyen:** en la ET. No,

**Alfredo Sotil:** que

**Angel Heyen:** en básicamente lo que es el título, el subtítulo.

**Alfredo Sotil:** Ah, okay, okay, okay.

### 00:47:57

**Alfredo Sotil:** El subtítulo, o sea, todo esto siempre está bien, pero lo que no está bien es la parte de los

**Angel Heyen:** Ajá. Es como, por ejemplo,

**Alfredo Sotil:** títulos.

**Angel Heyen:** antena aérea externa con todos sus ETS.

**Alfredo Sotil:** Ajá.

**Angel Heyen:** Ya todo eso antena aérea externa con todas sus CTs. Imaginemos que más abajo lo colocan, ¿no? Más abajo, más abajo.

**Alfredo Sotil:** nuevamente.

**Angel Heyen:** Ya lo colocan ahí, ¿no? Supongamos como parte del equipamiento de control de acceso, pero la antena no tiene nada que ver con control de acceso.

**Alfredo Sotil:** Hm. Ok.

**Angel Heyen:** Ajá. Es como que no sé, medio raro lo han

**Alfredo Sotil:** Okay. Pero lo que la digamos el software toma en cuenta es más que

**Angel Heyen:** hecho.

**Alfredo Sotil:** todo esto, ¿verdad? Este tipo de cosas. O sea, lo que estaría mal en todo caso es como la parte de los títulos, ¿cierto?

**Angel Heyen:** Sí, más o menos.

**Alfredo Sotil:** parte de los títulos y pero todos estos puntos realmente sí están bien,

**Angel Heyen:** Claro,

**Alfredo Sotil:** algo así.

**Angel Heyen:** claro, claro. Las especificaciones técnicas están

### 00:49:28 {#00:49:28}

**Alfredo Sotil:** Okay. De repente podemos eh especificar esto,

**Angel Heyen:** bien.

**Alfredo Sotil:** ¿no?, en la IA para que lo tome en cuenta y sepa que pueden haber errores en cuanto a los títulos, pero no en cuanto a los requerimientos.

**Angel Heyen:** Mhm.

**Alfredo Sotil:** Okay. Bueno, sería cuestión de experimentar nada más, Ángel. E,

**Angel Heyen:** Claro.

**Alfredo Sotil:** ¿qué te parece si Bueno, no sé si tienes otra consulta más que podamos aquí abordar?

**Angel Heyen:** No, no, no. Eh, todo claro por mi parte.

**Alfredo Sotil:** Okay.

**Angel Heyen:** No sé si si mi equipo tiene alguna

**Alfredo Sotil:** ¿Alguien más tienen alguna pregunta?

**Angel Heyen:** consulta.

**Misael Portilla Cortez:** Hola, ¿qué tal? Buenas tardes.

**Alfredo Sotil:** ¿Qué tal? Me

**Misael Portilla Cortez:** Una consulta, este,

**Alfredo Sotil:** dice

**Misael Portilla Cortez:** ahí veo que dice donde dice toda esa columna. Ahí se va a poner todas este los datashí de los equipos.

**Alfredo Sotil:** eh en esta parte de acá.

**Misael Portilla Cortez:** Sí. o solamente, mira, de mi punto de vista,

**Alfredo Sotil:** Sí.

**Misael Portilla Cortez:** yo creía que se apongo a las especificaciones técnicas, me busca el equipo y me da la misma vez el datashi del, o sea, el datash del equipo.

### 00:50:54

**Alfredo Sotil:** O sea, cómo eh a ver, para entenderte bien, ¿cómo sería? A

**Angel Heyen:** Alfredo, él está consultando que si es como si le estuvieses consultando a

**Alfredo Sotil:** ver,

**Angel Heyen:** Google, ¿no?

**Alfredo Sotil:** ya, pero no no sería ese mecanismo.

**Angel Heyen:** Por ejemplo. Claro. Sí. Lo que pasa es que eh ¿qué pasa? que nosotros a veces para ganar tiempo cuando esperamos una una respuesta del proveedor, eh también podrías hacerlo.

**Alfredo Sotil:** Mhm.

**Angel Heyen:** Nosotros a veces, bueno, por lo menos yo para ganar tiempo, a veces cuando no sé qué equipo es, agarro las especificaciones técnicas, eh,

**Alfredo Sotil:** Mhm.

**Angel Heyen:** las pongo en la y le digo este, ¿qué qué equipo es a la cual está direccionado o qué equipo es la que calza, ¿no? Y y la IA lo que hace es hacer el análisis de todo lo que indica en la especificación técnica y me manda y me dice, "No, el equipo que cumple con todas las especificaciones técnicas es tal te manda con la marca y

**Alfredo Sotil:** Okay.

**Angel Heyen:** modelo,

**Alfredo Sotil:** Ustedes lo que hacen es buscar como que en la IA de Google, ¿no? ponen ahí el requerimiento y le piden que por favor busque algún

### 00:52:12

**Angel Heyen:** no de Google no puede ser chay IPT, copy cualquiera.

**Alfredo Sotil:** Mhm.

**Angel Heyen:** Tú le tomas captura o uno le toma captura a las especificaciones

**Alfredo Sotil:** Mhm.

**Angel Heyen:** técnicas, las colocas ahí y le y le haces la pregunta, ¿no? ¿Qué equipo cumple con todas las especificaciones técnicas? ¿No? O un porcentaje, ¿no? Y ahí te lanza, ¿no? Tal equipo es la que cumple con todas las explicaciones técnicas. Luego lo que se hace o lo que hacemos nosotros es ver la ficha técnica y vemos qué tan cierto es lo que nos dice la IA.

**Alfredo Sotil:** Okay. Y y ¿qué hacen después de eso? ¿Descargan ese archivo? ¿Cómo hacen?

**Angel Heyen:** Claro.

**Alfredo Sotil:** No sea

**Angel Heyen:** Y claro, luego de eso hacemos todo el proceso que ya tú conoces,

**Alfredo Sotil:** porque

**Angel Heyen:** ¿no? Eh eh direccionamos al punto, a la página, empezamos

**Alfredo Sotil:** Claro, pero digamos puede ser que ese documento que ustedes encuentren en la web no es uno de los

**Angel Heyen:** a

**Alfredo Sotil:** proveedores con los que ustedes trabajan o sí.

**Angel Heyen:** No,

**Alfredo Sotil:** Ajá.

**Angel Heyen:** no.

**Alfredo Sotil:** Okay,

### 00:53:15

**Angel Heyen:** Mm. No

**Alfredo Sotil:** okay, okay. Pero básicamente sería que si ustedes, bueno, si no está entre los PDF de los proveedores que ustedes tienen,

**Angel Heyen:** necesariamente.

**Alfredo Sotil:** lo que pueden hacer es de que lo encuentran a través de la IA, perdón, a través del chat GPT que les dice, "Bueno, este tal y este proveedor tiene esto." Ustedes se descargan la ficha para confirmar que sí, ¿no? Y lo que pueden hacer es subir ese, o sea, si ustedes, claro, están seguros de que pueden conseguir el producto y todo eso, lo que el work around sería, okay, ya tenemos este nuevo PDF que deberíamos de agregar acá la parte de documentos, ¿no?

**Angel Heyen:** H. Yeah.

**Alfredo Sotil:** y lo adjuntan, se subiría aquí y es parte de su biblioteca, ¿no?, de su base de datos de PDFs, ¿no? Y con esto ya podrían ir a buscar el eh hacer el análisis, ¿no? Debería de encontrar las coincidencias, ¿cierto? O sea, esa podría ser la solución, ¿no? Porque ustedes son documentos que no tienen dentro de su scope. Entonces lo que hacen es buscarlo por fuera, ver quién tiene ese producto y este al final terminan haciendo el análisis sobre ese PDF, ¿no?

### 00:54:42 {#00:54:42}

**Alfredo Sotil:** Lo ideal sería de que ustedes encuentren el PDF, confirmen que sí es el correcto, lo adjuntan a su biblioteca y que el sistema haga todo el análisis, anote y escriba en la matriz, ¿no? Eso eso les sirve, les puede servir de esa forma.

**Angel Heyen:** Sí, Misael. A, a ver,

**Alfredo Sotil:** Aló.

**Angel Heyen:** que había tomado

**Misael Portilla Cortez:** Creo que sí mi punto de vista, pero sería más algo ideal, ¿no? Que te busque el PDF, tú subas las especificaciones técnicas y automáticamente te encuentra el documento, ¿no? El datas sheet del equipo y a partir de eso ya te armé la matriz de cumplimiento como la carpeta digital. Bueno, ese sería mi punto de vista,

**Alfredo Sotil:** Claro.

**Misael Portilla Cortez:** ¿no?

**Alfredo Sotil:** Sí, sí, te

**Misael Portilla Cortez:** Porque miren, si vamos a estar este vamos a claro, sería bueno almacenarlo en una base de datos, pero ¿qué pasa si metemos el documento?

**Alfredo Sotil:** entiendo.

**Misael Portilla Cortez:** No solamente que le pasen los proyectos no se repiten los equipos a veces difícil se repite otro modelo, otro modelo, otro modelo. Simplemente eso nos va eso de hacer tener una base de datos nos va a daría si lo tenemos ese ese equipo, ¿no?

### 00:55:59 {#00:55:59}

**Misael Portilla Cortez:** Si no lo tiene, tenemos que seguir buscando.

**Alfredo Sotil:** Sí, claro, entiendo. Este, bueno, lo que pasa de que el scope de este de este aplicativo era, bueno, por lo que yo tenía entendido, era como que ustedes ya trabajaban con con ciertos proveedores y ya conocían los PDFs de los proveedores, ¿no? Y y como que eran parte de sus referencias, ¿no? Pero si ustedes me dicen que buscan también documentos fuera, ¿no?, de digamos de sus referencias para poder adquirirlos y cumplir, este cambia un poco la cuestión, ¿no? Porque podríamos hacer algo podríamos hacer algo ahí, eh, pero no era el requerimiento inicial, pues no. Dime,

**Jean Paul Sotil:** Eh, no, solamente para agregar de esta parte, vea, nosotros lo que les hemos desarrollado ahorita es una prueba de concepto según digamos, o sea, la idea de esta prueba de concepto es poder mostrar que el que que la IA está siendo capaz de generar estos documentos a través de de una base de datos de de de PDFs que nosotros tenemos la capacidad de subir dentro de la plataforma. Eso, eso que que tú menciones, esto, o sea, nosotros podemos hacer todo, cualquier tipo de funcionabilidad, eso entraría como una y esa es la idea, digamos, de de de tener una plataforma, que ustedes puedan agregar features según se va adaptando al negocio de ustedes.

### 00:57:42

**Jean Paul Sotil:** Si ustedes requieren que nosotros busquemos en algunas fuentes donde ustedes hacen las búsquedas de estos documentos o que tengamos algunos proveedores donde nosotros podemos hacer esas búsquedas, todo eso se puede agregar de alguna forma al módulo de documentos. Entonces, tendríamos una sección ahí donde ustedes dicen, vamos a buscar eh archivos, documentos, eh la fuente, ¿verdad? Eh, y todo todo esto digamos entraría como un como parte de un feature dentro del módulo de documentos. Entonces, la idea de que ustedes tengan ahorita esta funcionabilidad donde se agregan los documentos en esta sección es que ustedes tengan como un una un referencia sólida de documentos que tienes que tienen ustedes a la mano. Entonces, eh eso de ahí podría entrar como algo extraordinario que se desarrolla dentro de su plataforma. Al final es eso.

**Alfredo Sotil:** Claro, igual bueno, buen aporte, Misael, o sea, son cosas que se pueden crear, ¿no? O sea,

**Angel Heyen:** Claro,

**Alfredo Sotil:** hay que analizarlas.

**Angel Heyen:** Alfredo. Sí. Eh, ¿me escuchan?

**Alfredo Sotil:** Sí, te escucho.

**Angel Heyen:** Sí. Mira, lo que mencionaba mi compañero Misael es cierto. Lo que pasa es que eh a veces lo que nos demora es encontrar qué qué equipo es el que cumple con las especificaciones técnicas, ¿cierto?, que nos solicitan.

### 00:59:17 {#00:59:17}

**Angel Heyen:** ¿Por qué? Porque como nosotros trabajamos básicamente como terceros para el estado, eh, para que nos puedan aprobar un equipo debe ser el 100% o si es que si es que no es un 100% debe ser a una a un buen porcentaje de cumplimiento eh para que pueda ser aprobado. Ahora, si eh tú, como te has percatado, en el sistema de control de acceso, hay un apartado donde dice carta de sustento, ¿cierto?

**Alfredo Sotil:** Eh, sí,

**Angel Heyen:** Ya,

**Alfredo Sotil:** lo son las partes que no se han encontrado en teoría.

**Angel Heyen:** claro. Así como también cuando tuvimos la primera reunión con con el ingeniero Rodrigo, ¿qué pasa? el ingeniero Rodrigo eh les comentó es que nosotros ya tenemos como que eh una serie o un una variedad de marcas con las que nosotros trabajamos eh y básicamente trabajamos con con esos equipos. Entonces, eh pero eh en muchos casos, por ejemplo, para el control de acceso que que que tú has visto tiene una carta de sustento. ¿Por qué tiene una carta de sustento de parte de la marca? Porque con sus fichas técnicas no cumplimos. Entonces necesitamos el respaldo de la marca para cumplir. Eso, ¿qué quiere decir? que eh eh que las especificaciones técnicas que nos pide eh la supervisión no es con Hick Vision, no con esa marca, es con otra marca, ¿no?

### 01:00:56 {#01:00:56}

**Angel Heyen:** Entonces nosotros hacemos lo posible de trabajar con las marcas con las que ya tenemos tiempo trabajando, con las que en su momento también lo mencionó el ingeniero Rodrigo. Entonces, pero cuando ya supervisión no acepta, entonces en este caso necesitamos ya eh mandar a probar eh los equipos que están direccionados, como lo mencionaba Misael, ¿no? Entonces ahí a veces eh está a veces el un pequeño detalle, ¿no?, que tenemos que buscar qué equipo es el que calza con todas las especificaciones técnicas. Normalmente se hace eso y ya cuando como un como el un recurso final, por así decirlo, porque en un principio no se manda lo que cumple con todo,

**Alfredo Sotil:** Entiendo ya. O sea, y dime una cosa,

**Angel Heyen:** No.

**Alfredo Sotil:** ¿y sobre estas cartas de cumplimiento? H, supongo que ustedes ya tienen cartas de cumplimiento que pueden usar para diferentes proyectos, ¿no? O sea, por ejemplo, no siempre tienen que pedir cartas de cumplimiento eh cuando ya han generado eh cartas de cumplimiento para otro proyecto, ¿no? O sea, ustedes reutilizan esas cartas de cumplimiento. Esa es la pregunta.

**Angel Heyen:** No, lo que hacemos es este solicitar otra carta de cumplimiento o carta de sustento.

**Alfredo Sotil:** Carta de

**Angel Heyen:** Sí, porque es por un tema de de no no no de caducidad,

### 01:02:31 {#01:02:31}

**Alfredo Sotil:** sustanto.

**Angel Heyen:** pero como nos envían con una fecha, entonces siempre una carta de sustento con una fecha más próxima o más actual tiene mayor peso,

**Alfredo Sotil:** Dime, ¿existe la posibilidad de reutilizar estas cartas de

**Angel Heyen:** No.

**Alfredo Sotil:** sustento? O sea, por ejemplo, eh que tú las puedas pedir sin fecha y nosotros a través de la IA agregar esta fecha. o no es válido.

**Angel Heyen:** Se puede hacer

**Alfredo Sotil:** Okay.

**Angel Heyen:** eso.

**Alfredo Sotil:** O utilizarlas de repente como parte de la búsqueda. O sea, a lo que voy es de,

**Angel Heyen:** Eso. Claro.

**Alfredo Sotil:** o sea, podemos utilizar todas las cartas de cumplimiento que ustedes han tenido durante el tiempo que están trabajando con los proyectos para decir,

**Angel Heyen:** Hm.

**Alfredo Sotil:** "Okay, no está este requerimiento, pero se encontró en la carta de cumplimiento tal. Ustedes ya saben que tienen que generar una carta de cumplimiento, eh, sí, de sustento, ¿no? Para los requerimientos que no se han encontrado. ¿Entiende?

**Angel Heyen:** Sí.

**Jean Paul Sotil:** Eh, Alfredo, a mí a mí también lo que se me ocurre, como nosotros estamos trabajando e la parte proyectos como si fuese un pipeline ahí como de,

**Alfredo Sotil:** Okay.

### 01:03:56 {#01:03:56}

**Jean Paul Sotil:** o sea, tiene la parte análisis, nosotros también podemos tal vez agregar después de este análisis un una tabla eh donde les permita a ustedes visualizar eh todas estos requerimientos que no se han encontrado Y eh también por cada uno de estos requerimientos nosotros podríamos como eh, o sea, aparte aparte de lo que dice el Freo que podría eso está muy bueno también podríamos como analizar tal vez estas cartas que ya se que ya se ya están documentadas dentro del sistema y darle la opción eh a ustedes para que adjunten eh estas cartas de de requerimiento a cada uno a cada uno de estos que no se que no se encontraron dentro de de del ETT, bueno, de la de la matriz y ya ahí ustedes podrían adjuntar esta evidencia y al final ya del pipeline del de de la entrega o del proyecto, eh ustedes eh ya tendrían tal vez un PDF como con eh con toda la información y estas estas evidencias adjuntas también. Entonces, todo el documento ya estaría como de alguna forma eh compilado ya con todas las informaciones que ustedes necesitan. Eso de ahí eh sería como parte de de de lo que tenemos que darle continuidad, ¿no?, al al proyecto. cada proyecto eh llevaría sus etapas y y y sus etapas de conclusión, análisis, errores y todo eso.

**Alfredo Sotil:** Ángel, entendió la

**Angel Heyen:** Sí,

### 01:05:37 {#01:05:37}

**Alfredo Sotil:** idea.

**Angel Heyen:** sí, sí, sí. Alfredo, entendí, entendí.

**Alfredo Sotil:** Okay. Bueno, este vamos a evaluar también lo que lo que dijo Misael. Vamos a evaluar si es factible dentro de este POC. Okay. Pero queda queda anotado. Ahí está bien. Este,

**Angel Heyen:** Mhm.

**Alfredo Sotil:** ¿alguna otra pregunta que tengan? Listo. Parece que no.

**Angel Heyen:** Sí,

**Alfredo Sotil:** Okay. Eh, Ángel, eh, vamos a trabajar en esos puntos en los que me mencionaste y la próxima semana con estos puntos ya realizados, te voy a pedir a ti que que trates de hacer una prueba real.

**Angel Heyen:** Mhm.

**Alfredo Sotil:** Okay, te voy a entregar la app para que puedas un poco descubrirla, que puedas hacer análisis y que puedas como revisar el resultado. Sí, para que este me digas si encuentras algo

**Angel Heyen:** Mhm.

**Alfredo Sotil:** que no está bien para poder este tratar de mitigarlo.

**Angel Heyen:** Mhm.

**Alfredo Sotil:** Okay. Excelente. Bueno, chicos, esta ha sido la demo hasta ahora.

**Angel Heyen:** Claro.

**Alfredo Sotil:** Este, la próxima semana nos volvemos a juntar. Ahí vamos a estar coordinando con Juanjo. Sí. Y quedamos atentos ahí ante cualquier otra consulta. Pueden escribirle a Juanjo o a Polo, a mí. Sí. Excelente.

**Angel Heyen:** Listo. Muchas gracias.

**Alfredo Sotil:** Muchas gracias a todos.

**Angel Heyen:** Gracias. Gracias.

**Alfredo Sotil:** Listo. Buen día,

**Jean Paul Sotil:** Gracias.

**Alfredo Sotil:** chicos. C

### La transcripción finalizó después de 01:25:44

*Esta transcripción editable se generó por computadora y puede contener errores. Los usuarios también pueden cambiar el texto después de que se cree.*