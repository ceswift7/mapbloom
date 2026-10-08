/* One famous landmark per country (id = ISO numeric code, as everywhere else). Merged into the written quiz bank as the land fact "lm".
   Chosen to be unambiguous and to avoid giving the country's name away. */
const LM={
"004":"Minaret of Jam","008":"Berat Castle","012":"Timgad","020":"Casa de la Vall","024":"Kalandula Falls","028":"Nelson's Dockyard","031":"Maiden Tower","032":"Perito Moreno Glacier","036":"Uluru","040":"Schönbrunn Palace",
"044":"Dean's Blue Hole","048":"Qal'at al-Bahrain","050":"Ahsan Manzil","051":"Geghard Monastery","052":"Harrison's Cave","056":"Atomium","064":"Paro Taktsang","068":"Salar de Uyuni","070":"Stari Most","072":"Okavango Delta",
"076":"Christ the Redeemer","084":"Great Blue Hole","090":"Marovo Lagoon","096":"Omar Ali Saifuddien Mosque","100":"Rila Monastery","104":"Shwedagon Pagoda","108":"Gishora Drum Sanctuary","112":"Mir Castle","116":"Angkor Wat","120":"Mount Cameroon",
"124":"CN Tower","132":"Pico do Fogo","140":"Dzanga Bai","144":"Sigiriya","148":"Ennedi Plateau","152":"Moai of Easter Island","156":"Forbidden City","170":"Las Lajas Sanctuary","174":"Mount Karthala","178":"Basilique Sainte-Anne",
"180":"Nyiragongo","188":"Arenal Volcano","191":"Diocletian's Palace","192":"El Capitolio","196":"Petra tou Romiou","203":"Charles Bridge","204":"Royal Palaces of Abomey","208":"The Little Mermaid","212":"Boiling Lake","214":"Alcázar de Colón",
"218":"Cotopaxi","222":"Joya de Cerén","226":"Pico Basilé","231":"Rock-Hewn Churches of Lalibela","232":"Fiat Tagliero Building","233":"Toompea Castle","242":"Garden of the Sleeping Giant","246":"Suomenlinna","250":"Eiffel Tower","262":"Lake Assal",
"266":"Lopé National Park","268":"Gergeti Trinity Church","270":"Kunta Kinteh Island","275":"Church of the Nativity","276":"Brandenburg Gate","288":"Cape Coast Castle","296":"Phoenix Islands Protected Area","300":"Parthenon","308":"Underwater Sculpture Park","320":"Tikal",
"324":"Mount Nimba","328":"Kaieteur Falls","332":"Citadelle Laferrière","336":"St Peter's Basilica","340":"Copán","348":"Fisherman's Bastion","352":"Gullfoss","356":"Taj Mahal","360":"Borobudur","364":"Persepolis",
"368":"Ziggurat of Ur","372":"Cliffs of Moher","376":"Masada","380":"Colosseum","384":"Basilica of Our Lady of Peace","388":"Dunn's River Falls","392":"Mount Fuji","398":"Baikonur Cosmodrome","400":"Petra","404":"Maasai Mara",
"408":"Juche Tower","410":"Gyeongbokgung Palace","414":"Liberation Tower","417":"Issyk-Kul","418":"Pha That Luang","422":"Baalbek","426":"Maletsunyane Falls","428":"Rundāle Palace","430":"Providence Island","434":"Leptis Magna",
"438":"Vaduz Castle","440":"Hill of Crosses","442":"Bock Casemates","450":"Avenue of the Baobabs","454":"Mount Mulanje","458":"Petronas Towers","462":"Hukuru Miskiy","466":"Great Mosque of Djenné","470":"Mdina","478":"Eye of the Sahara",
"480":"Le Morne Brabant","484":"Chichén Itzá","492":"Monte Carlo Casino","496":"Erdene Zuu Monastery","498":"Cricova wine cellars","499":"Bay of Kotor","504":"Hassan II Mosque","508":"Gorongosa National Park","512":"Sultan Qaboos Grand Mosque","516":"Sossusvlei",
"520":"Command Ridge","524":"Boudhanath","528":"Kinderdijk","548":"Mount Yasur","554":"Milford Sound","558":"Masaya Volcano","562":"Agadez Grand Mosque","566":"Zuma Rock","578":"Preikestolen","583":"Nan Madol",
"584":"Bikini Atoll","585":"Rock Islands","586":"Badshahi Mosque","591":"Miraflores Locks","598":"Kokoda Track","600":"Jesuit Ruins of Trinidad","604":"Machu Picchu","608":"Chocolate Hills","616":"Wawel Castle","620":"Belém Tower",
"624":"Bijagós Archipelago","626":"Cristo Rei of Dili","634":"Museum of Islamic Art","642":"Bran Castle","643":"Saint Basil's Cathedral","646":"Kigali Genocide Memorial","659":"Brimstone Hill Fortress","662":"The Pitons","670":"La Soufrière","674":"Guaita Tower",
"678":"Pico Cão Grande","682":"Mada'in Salih","686":"African Renaissance Monument","688":"Kalemegdan Fortress","690":"Vallée de Mai","694":"Bunce Island","702":"Marina Bay Sands","703":"Spiš Castle","704":"Hạ Long Bay","705":"Lake Bled",
"706":"Laas Geel","710":"Table Mountain","716":"Matobo Hills","724":"Sagrada Família","728":"The Sudd","729":"Pyramids of Meroë","740":"Fort Zeelandia","748":"Mantenga Falls","752":"Vasa Museum","756":"Jungfraujoch",
"760":"Krak des Chevaliers","762":"Iskanderkul","764":"Wat Arun","768":"Koutammakou","776":"Haʻamonga ʻa Maui","780":"Pitch Lake","784":"Burj Khalifa","788":"Amphitheatre of El Jem","792":"Hagia Sophia","795":"Darvaza gas crater",
"798":"Funafuti Conservation Area","800":"Bwindi Impenetrable Forest","804":"Kyiv Pechersk Lavra","807":"Matka Canyon","818":"Pyramids of Giza","826":"Big Ben","834":"Mount Kilimanjaro","840":"Statue of Liberty","854":"Ruins of Loropéni","858":"Palacio Salvo",
"860":"Registan","862":"Angel Falls","882":"To Sua Ocean Trench","887":"Shibam","894":"Kalambo Falls"
};
Object.keys(LM).forEach(id=>{const q=QZ[id]||(QZ[id]={});(q.g||(q.g={})).lm=LM[id]});
