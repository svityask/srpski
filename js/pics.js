// Картинки к словам для карточек: сербское слово как в data.js → эмодзи.
// Только там, где картинка помогает запомнить; у абстрактных фраз картинки нет.
window.PICS = {
  // 1. Первые слова
  'Zdravo': '👋', 'Ćao': '👋', 'Dobar dan': '☀️', 'Dobro jutro': '🌅', 'Dobro veče': '🌆', 'Laku noć': '🌙',
  'Doviđenja': '👋', 'Vidimo se': '🙌', 'Pozdrav': '✉️',
  'Da': '✅', 'Ne': '❌', 'Hvala': '🙏', 'Hvala lepo': '🙏', 'Molim': '🙂', 'Izvolite': '🤲', 'Izvinite': '🙇',
  'Može': '👌', 'Važi': '🤝', 'Nema problema': '👍', 'Ne znam': '🤷',
  'Kako si?': '🙂', 'Kako ste?': '🙂', 'Dobro sam': '😊', 'Odlično': '🤩', 'Nije loše': '🙂', 'Onako': '😐',
  'Šta ima?': '👀', 'Sve je u redu': '👌',
  // 2. Знакомство
  'Drago mi je': '🤝', 'I meni': '🤝', 'Ovo je moj prijatelj': '🧑‍🤝‍🧑', 'Ovo je moja prijateljica': '👭', 'Ovo je moja žena': '👫',
  'Ja sam iz Rusije': '🇷🇺', 'Ja sam Rus': '🇷🇺', 'Ja sam Ruskinja': '🇷🇺', 'Živim u Beogradu': '🏙️',
  'Govorite li ruski?': '🗣️', 'Govorim malo srpski': '🗣️', 'Ne razumem': '🤔', 'Polako, molim vas': '🐢', 'Ponovite, molim vas': '🔁',
  'Koliko imaš godina?': '🎂', 'Imam trideset godina': '🎂', 'Šta radiš?': '💼', 'Radim kao programer': '💻', 'Radim od kuće': '🏠',
  'Studiram': '🎓', 'Ja sam u penziji': '👴', 'Oženjen sam': '💍', 'Udata sam': '💍',
  // 3. Числа и время
  'nula': '0️⃣', 'jedan': '1️⃣', 'dva': '2️⃣', 'tri': '3️⃣', 'četiri': '4️⃣', 'pet': '5️⃣', 'šest': '6️⃣', 'sedam': '7️⃣', 'osam': '8️⃣', 'devet': '9️⃣', 'deset': '🔟',
  'sto': '💯', 'hiljada': '🔢', 'hiljadu dinara': '💵',
  'Koliko je sati?': '🕒', 'Sada je tri sata': '🕒', 'Pola tri': '🕝', 'U koliko sati?': '⏰', 'minut': '⏱️', 'sada': '⏰',
  'danas': '📅', 'sutra': '📆', 'juče': '⏪', 'Kasnim': '🏃',
  'ponedeljak': '📅', 'utorak': '📅', 'sreda': '📅', 'četvrtak': '📅', 'petak': '🎉', 'subota': '🛋️', 'nedelja': '☀️', 'vikend': '🏖️', 'sedmica': '🗓️',
  'Vidimo se u petak': '🎉',
  // 4. Еда и напитки
  'kafa': '☕', 'čaj': '🍵', 'voda': '💧', 'kisela voda': '🫧', 'pivo': '🍺', 'vino': '🍷', 'sok': '🧃', 'mleko': '🥛',
  'Jednu kafu, molim': '☕', 'sa mlekom': '🥛', 'bez šećera': '🍬',
  'hleb': '🍞', 'meso': '🥩', 'piletina': '🍗', 'svinjetina': '🐖', 'riba': '🐟', 'sir': '🧀', 'jaja': '🥚', 'krompir': '🥔', 'supa': '🍲', 'salata': '🥗',
  'jelovnik': '📋', 'Sto za dvoje': '🍽️', 'Šta preporučujete?': '👨‍🍳', 'Ja ću ovo': '👉', 'Račun, molim': '🧾', 'Mogu li da platim karticom?': '💳',
  'Prijatno!': '😋', 'Ukusno je': '😋', 'Živeli!': '🥂', 'napojnica': '💶',
  'ćevapi': '🌭', 'pljeskavica': '🍔', 'burek': '🥧', 'kajmak': '🧈', 'ajvar': '🫑', 'sarma': '🥬', 'gibanica': '🥧', 'rakija': '🥃', 'šopska salata': '🥗', 'mala porcija': '🍽️',
  // 5. Семья
  'porodica': '👨‍👩‍👧', 'mama': '👩', 'tata': '👨', 'roditelji': '👫', 'brat': '👦', 'sestra': '👧', 'sin': '👦', 'ćerka': '👧',
  'muž': '🤵', 'žena': '👰', 'dete': '👶', 'deca': '🧒',
  'baka': '👵', 'deka': '👴', 'unuk': '👦', 'unuka': '👧', 'tetka': '👩', 'ujak': '👨', 'stric': '👨', 'rođak': '🧑', 'rođaka': '👩',
  'Imam brata': '👦', 'Imam sestru': '👧', 'Imam dvoje dece': '👧👦', 'Nemam dece': '🙅', 'Imate li decu?': '👶',
  'Ovo je moja porodica': '👨‍👩‍👧', 'Moj sin ide u školu': '🏫', 'Moja ćerka ima pet godina': '🎂',
  // 6. В городе
  'ulica': '🛣️', 'trg': '⛲', 'prodavnica': '🏪', 'pekara': '🥐', 'apoteka': '💊', 'banka': '🏦', 'menjačnica': '💱', 'pošta': '📮',
  'bolnica': '🏥', 'pijaca': '🧺', 'trafika': '📰',
  'Gde je apoteka?': '💊', 'levo': '⬅️', 'desno': '➡️', 'pravo': '⬆️', 'blizu': '📍', 'daleko': '🗺️', 'ovde': '📍', 'tamo': '👉',
  'iza ugla': '↪️', 'Kako da stignem do centra?': '🏙️', 'Izgubio sam se': '😵', 'Izgubila sam se': '😵',
  'autobus': '🚌', 'tramvaj': '🚋', 'taksi': '🚕', 'stanica': '🚏', 'karta': '🎫', 'Koliko košta karta?': '🎫',
  'Koji autobus ide do centra?': '🚌', 'Gde treba da siđem?': '🚏', 'Silazim ovde': '🚪', 'Stanite ovde, molim vas': '✋',
  // 7. Покупки
  'Koliko košta?': '💰', 'skupo': '💸', 'jeftino': '🏷️', 'kesa': '🛍️', 'Treba mi kesa': '🛍️', 'gotovina': '💵', 'kartica': '💳',
  'kasa': '🧾', 'popust': '🏷️', 'Samo gledam': '👀', 'dinar': '💰',
  'kilo': '⚖️', 'pola kila': '⚖️', 'voće': '🍎', 'povrće': '🥕', 'jabuke': '🍎', 'paradajz': '🍅', 'krastavac': '🥒', 'jagode': '🍓', 'luk': '🧅',
  'Dajte mi kilo jabuka': '🍎', 'Može malo jeftinije?': '🤏',
  'crven': '🟥', 'plav': '🟦', 'zelen': '🟩', 'žut': '🟨', 'beo': '⬜', 'crn': '⬛', 'siv': '🩶',
  'Mogu li da probam?': '👕', 'Imate li veći broj?': '👖', 'Imate li manji broj?': '👖',
  // 8. Путешествия
  'aerodrom': '🛫', 'let': '✈️', 'pasoš': '🛂', 'prtljag': '🧳', 'autobuska stanica': '🚌', 'železnička stanica': '🚆', 'peron': '🚉',
  'polazak': '🛫', 'dolazak': '🛬', 'Jednu kartu za Novi Sad': '🎫', 'povratna karta': '🔁',
  'smeštaj': '🏨', 'soba': '🛏️', 'rezervacija': '📝', 'Imam rezervaciju': '📝', 'ključ': '🔑', 'Doručak je uključen': '🍳',
  'Koja je šifra za internet?': '📶', 'Ne radi klima': '❄️', 'peškir': '🛁',
  'Kakvo je vreme?': '🌦️', 'Sunčano je': '☀️', 'Pada kiša': '🌧️', 'Pada sneg': '❄️', 'Hladno je': '🥶', 'Toplo je': '🌤️', 'Vruće je': '🥵',
  'vetar': '💨', 'košava': '🌬️',
  // 9. Жизнь в Сербии
  'stan': '🏢', 'kirija': '💶', 'stanodavac': '🧑‍💼', 'komšija': '🏘️', 'struja': '⚡', 'grejanje': '🔥', 'račun za struju': '🧾',
  'Nema tople vode': '🚿', 'kvar': '🔧', 'majstor': '🧰',
  'beli karton': '📄', 'privremeni boravak': '🪪', 'policija': '👮', 'šalter': '🪟', 'red': '🧍', 'Ko je poslednji?': '🧍',
  'obrazac': '📝', 'potpis': '✍️', 'overa': '🔏', 'Treba mi potvrda': '📃',
  'Pomoć!': '🆘', 'hitna pomoć': '🚑', 'Zovite policiju!': '🚓', 'lekar': '🧑‍⚕️', 'lek': '💊', 'recept': '📋',
  'Boli me glava': '🤕', 'Boli me stomak': '🤢', 'Imam temperaturu': '🤒', 'Prehlađen sam': '🤧', 'Alergičan sam na penicilin': '⚠️',
  // 10. Разговорный
  'Ajde!': '🏃', 'bre': '😤', 'polako': '🐢', 'Nema veze': '🤷', 'naravno': '👍', 'Stvarno?': '😮', 'Nema šanse': '🙅',
  'Svaka čast': '👏', 'Jao!': '😱', 'Bravo!': '👏',
  'pitati': '❓', 'život': '🌱', 'stolica': '🪑', 'pozorište': '🎭', 'odmor': '🏖️', 'divan': '✨', 'ponos': '🦁', 'čas': '📚',
  'zapravo': '💡', 'banja': '♨️', 'krevet': '🛏️', 'kuća': '🏠',
};
