/**
 * chaptersData.js
 * 
 * Estructura de datos con diseño en acuarela.
 * Integra las ilustraciones temáticas en acuarela para cada hoja,
 * manteniendo el texto 100% exacto de la carta original.
 */

const baseUrl = import.meta.env.BASE_URL || './';
export const asset = (path) => `${baseUrl}${path.startsWith('/') ? path.slice(1) : path}`;

export const bookMetadata = {
  title: "Para Lau",
  subtitle: "27 de Septiembre",
  songDetails: {
    title: "invisible string",
    artist: "Taylor Swift",
    album: "folklore",
    spotifyUrl: "https://open.spotify.com/track/6VsvKPJ4xjVNKpI8VVZ3SV",
    audioSrc: asset("audio/invisible_string.m4a"), // Canción completa (4:12)
    coverImg: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/7c/04/ba/7c04ba17-2ff8-21b3-0ac0-7d141f86e924/20UMGIM64216.rgb.jpg/300x300bb.jpg"
  }
};

export const chapters = [
  {
    id: "capitulo-1",
    numberRoman: "Capítulo I",
    number: 1,
    title: "27 de Septiembre",
    date: "27 de Septiembre",
    targetPage: 2,
    description: "Carta de cumpleaños",
    isUpcoming: false
  },
  {
    id: "capitulo-2",
    numberRoman: "Capítulo II",
    number: 2,
    title: "Próximamente",
    date: "Nuevos momentos",
    targetPage: 10,
    description: "Espacio reservado para nuevos capítulos",
    isUpcoming: true
  }
];

export const bookPages = [
  // -------------------------------------------------------------
  // PÁGINA 1: ÍNDICE DE CAPÍTULOS
  // -------------------------------------------------------------
  {
    pageNumber: 1,
    type: "table_of_contents",
    title: "Índice"
  },

  // -------------------------------------------------------------
  // PÁGINA 2: PORTADILLA CAPÍTULO I
  // -------------------------------------------------------------
  {
    pageNumber: 2,
    type: "chapter_header",
    roman: "Capítulo I",
    title: "27 de Septiembre",
    watercolorDecor: asset("images/watercolor/flower_light.jpg")
  },

  // -------------------------------------------------------------
  // PÁGINA 3: TEXTO CARTA (PARTE 1) + ACUARELA FLOR & LUZ
  // -------------------------------------------------------------
  {
    pageNumber: 3,
    type: "letter_text_with_art",
    header: "Feliz cumpleaños, Lau.",
    paragraphs: [
      "Hoy quería tomarme el tiempo de escribirte algo que estuviera a la altura del día y, sobre todo, a la altura de la persona que eres. No quería que fuera solo un mensaje protocolario de felicitación, sino una pausa para decirte algo sincero: admiro profundamente a la mujer en la que te has convertido.",
      "Desde que nos conocimos he visto en ti a alguien singular: una mujer con una lucidez admirable, con metas claras, con una determinación firme y, al mismo tiempo, con una sensibilidad y una calidez que hacen que estar cerca de ti se sienta tan bien."
    ],
    artImage: asset("images/watercolor/flower_light.jpg"),
    artPosition: "bottom"
  },

  // -------------------------------------------------------------
  // PÁGINA 4: FOTO + TEXTO CARTA (PARTE 2)
  // -------------------------------------------------------------
  {
    pageNumber: 4,
    type: "photo_polaroid",
    photo: {
      src: asset("images/lau_sergio_portrait_gorgeous.jpg"),
      alt: "25 de Septiembre",
      caption: "25 de Septiembre"
    },
    paragraphs: [
      "Me encanta ver cómo has crecido, la sabiduría con la que asumes cada paso y la libertad con la que defiendes quién eres. Eres dueña de tu propio espacio y de tus convicciones, y ver esa autenticidad es algo inspirador."
    ]
  },

  // -------------------------------------------------------------
  // PÁGINA 5: TEXTO CARTA (PARTE 3) + ACUARELA CAFÉ & DIÁLOGO
  // -------------------------------------------------------------
  {
    pageNumber: 5,
    type: "letter_text_with_art",
    paragraphs: [
      "Sé bien que durante un buen tiempo no estuvimos tan cerca como antes. Es algo que me da un poco de nostalgia, porque me hubiera encantado acompañar de cerca muchas de tus victorias cotidianas. Pero también creo que las personas cambian, evolucionan y encuentran nuevos momentos para reencontrarse con otra mirada.",
      "Hoy me gustaría ser mucho más parte de tu presente: no solo para aplaudir tus fortalezas y todo lo que logras, sino para conocerte en todas tus dimensiones. Conocer tus días tranquilos, tus dudas, tus manías y esas pequeñas imperfecciones que son, al final del día, el lugar donde reside la versión más honesta, humana y bonita de alguien."
    ],
    artImage: asset("images/watercolor/coffee_cups.jpg"),
    artPosition: "bottom"
  },

  // -------------------------------------------------------------
  // PÁGINA 6: FOTOS + TEXTO CARTA (PARTE 4) + ACUARELA POSTRES
  // -------------------------------------------------------------
  {
    pageNumber: 6,
    type: "scrapbook_double",
    photo1: {
      src: asset("images/postres_celebracion.jpg"),
      caption: "25 de Septiembre"
    },
    photo2: {
      src: asset("images/lau_sergio_selfie_warm.jpg"),
      caption: "25 de Septiembre"
    },
    paragraphs: [
      "Verte el viernes pasado me confirmó todo esto. Hacía tiempo no compartíamos un momento así, y verte reír con esa emoción viva mientras me contabas cada anécdota y cada aventura fue el mejor regalo."
    ],
    artImage: asset("images/watercolor/dessert_treats.jpg")
  },

  // -------------------------------------------------------------
  // PÁGINA 7: TEXTO CARTA (PARTE 5) + ACUARELA CUADERNO & BRILLO
  // -------------------------------------------------------------
  {
    pageNumber: 7,
    type: "letter_text_with_art",
    paragraphs: [
      "Me encanta la forma en la que cuentas tus historias, con tanta chispa y tanta vida; de verdad te habría escuchado horas enteras sin mirar el reloj. Y mientras hablabas, no pude evitar acordarme de aquel dibujo que intenté hacerte hace años. Te confieso que en ese momento me dio risa y frustración no lograr plasmarte como quería, pero el viernes entendí la razón: ningún papel podía capturar ese brillo auténtico, esa energía tan linda que tienes cuando disfrutas la vida a tu manera.",
      "Dicen las que saben de canciones que las mujeres van transitando por distintas eras: momentos de introspección, etapas donde hay que reconstruirse, y otras donde se aprende a pisar fuerte y a no negociar el brillo propio ante nada ni nadie. Verte hoy es ver a alguien que habita su mejor era con orgullo y plenitud."
    ],
    artImage: asset("images/watercolor/artist_sketch.jpg"),
    artPosition: "bottom"
  },

  // -------------------------------------------------------------
  // PÁGINA 8: TEXTO CARTA (PARTE 6 - CANCIÓN) + ACUARELA HILO DORADO
  // -------------------------------------------------------------
  {
    pageNumber: 8,
    type: "musical_highlight",
    hasMusicTrigger: true,
    paragraphs: [
      "Nunca dejes que nadie, bajo ninguna circunstancia, intente opacar ese destello, porque no solo te hace única, sino que llena de luz a quien tiene el privilegio de compartir contigo.",
      "Por eso, como regalo y complicidad entre nosotros, te quiero dejar una canción: \"invisible string\". La elijo porque me gusta pensar que, sin importar las vueltas de la vida, las pausas o el tiempo transcurrido, hay conexiones genuinas que guardan un hilo dorado esperando el momento indicado para volverse a encontrar."
    ],
    artImage: asset("images/watercolor/golden_thread.jpg")
  },

  // -------------------------------------------------------------
  // PÁGINA 9: CIERRE DE LA CARTA + ACUARELA RAMO DE CUMPLEAÑOS
  // -------------------------------------------------------------
  {
    pageNumber: 9,
    type: "letter_closing",
    photo: {
      src: asset("images/lau_sergio_mesa.jpg"),
      caption: "25 de Septiembre"
    },
    paragraphs: [
      "Ojalá la vida nos dé la oportunidad de seguir sumando historias, largas conversaciones y, quién sabe, quizás ser parte de algunas de tus próximas aventuras.",
      "Que este nuevo año te traiga todo lo bonito que te mereces y todo el espacio para seguir logrando lo que te propongas.",
      "Feliz cumpleaños, Lau. Te mando un abrazo enorme."
    ],
    artImage: asset("images/watercolor/birthday_bouquet.jpg")
  },

  // -------------------------------------------------------------
  // PÁGINA 10: NUEVOS CAPÍTULOS (PRÓXIMAMENTE)
  // -------------------------------------------------------------
  {
    pageNumber: 10,
    type: "epilogue_upcoming",
    title: "Capítulo II",
    subtitle: "Próximamente",
    note: "Espacio reservado para los próximos capítulos que se sumen a este libro.",
    artImage: asset("images/watercolor/cover_wreath.jpg")
  }
];
