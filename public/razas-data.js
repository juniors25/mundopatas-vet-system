// Base de datos de razas de perros y gatos

const RAZAS_CANINAS = [
    "Affenpinscher",
    "Afgano",
    "Airedale Terrier",
    "Akita Americano",
    "Akita Inu",
    "Alaskan Malamute",
    "American Bully",
    "American Staffordshire Terrier",
    "Basenji",
    "Basset Hound",
    "Beagle",
    "Bearded Collie",
    "Bichón Frisé",
    "Bichón Maltés",
    "Bloodhound",
    "Border Collie",
    "Border Terrier",
    "Borzoi",
    "Boston Terrier",
    "Bouvier de Flandes",
    "Boxer",
    "Boyero de Berna",
    "Braco Alemán",
    "Braco de Weimar",
    "Braco Húngaro",
    "Braco Italiano",
    "Bull Terrier",
    "Bulldog Americano",
    "Bulldog Francés",
    "Bulldog Inglés",
    "Bullmastiff",
    "Cairn Terrier",
    "Caniche (Poodle) Toy",
    "Caniche (Poodle) Miniatura",
    "Caniche (Poodle) Mediano",
    "Caniche (Poodle) Gigante",
    "Cane Corso",
    "Cavalier King Charles Spaniel",
    "Chihuahua",
    "Chow Chow",
    "Cimarrón Uruguayo",
    "Cocker Spaniel Americano",
    "Cocker Spaniel Inglés",
    "Collie",
    "Corgi Galés de Cardigan",
    "Corgi Galés de Pembroke",
    "Dachshund (Teckel)",
    "Dálmata",
    "Dandie Dinmont Terrier",
    "Doberman",
    "Dogo Alemán (Gran Danés)",
    "Dogo Argentino",
    "Dogo de Burdeos",
    "English Setter",
    "Fila Brasileiro",
    "Fox Terrier",
    "Galgo Español",
    "Galgo Italiano",
    "Golden Retriever",
    "Gordon Setter",
    "Gran Pirineo",
    "Greyhound",
    "Husky Siberiano",
    "Irish Setter",
    "Irish Wolfhound",
    "Jack Russell Terrier",
    "Keeshond",
    "Kerry Blue Terrier",
    "Komondor",
    "Kuvasz",
    "Labrador Retriever",
    "Lakeland Terrier",
    "Lebrel Afgano",
    "Leonberger",
    "Lhasa Apso",
    "Lobero Irlandés",
    "Mastín del Pirineo",
    "Mastín Español",
    "Mastín Inglés",
    "Mastín Napolitano",
    "Mastín Tibetano",
    "Mestizo",
    "Ovejero Alemán (Pastor Alemán)",
    "Ovejero Australiano",
    "Ovejero Belga",
    "Ovejero de Shetland",
    "Papillón",
    "Pastor Australiano",
    "Pastor Belga Groenendael",
    "Pastor Belga Malinois",
    "Pastor Belga Tervueren",
    "Pastor Blanco Suizo",
    "Pastor de Anatolia",
    "Pastor de los Pirineos",
    "Pastor Ganadero Australiano",
    "Pekinés",
    "Perro de Agua Español",
    "Perro de Agua Portugués",
    "Perro de Montaña de los Pirineos",
    "Perro Lobo Checoslovaco",
    "Perro sin Pelo del Perú",
    "Petit Basset Griffon Vendéen",
    "Pinscher Miniatura",
    "Pitbull",
    "Pointer Inglés",
    "Pomerania",
    "Pug (Carlino)",
    "Rhodesian Ridgeback",
    "Rottweiler",
    "Rough Collie",
    "Saluki",
    "Samoyedo",
    "San Bernardo",
    "Schipperke",
    "Schnauzer Gigante",
    "Schnauzer Mediano",
    "Schnauzer Miniatura",
    "Scottish Terrier",
    "Shar Pei",
    "Shiba Inu",
    "Shih Tzu",
    "Springer Spaniel Inglés",
    "Staffordshire Bull Terrier",
    "Terranova",
    "Terrier Escocés",
    "Terrier Tibetano",
    "Vizsla",
    "Weimaraner",
    "West Highland White Terrier",
    "Whippet",
    "Xoloitzcuintle",
    "Yorkshire Terrier"
];

const RAZAS_FELINAS = [
    "Abisinio",
    "American Curl",
    "American Shorthair",
    "American Wirehair",
    "Angora Turco",
    "Azul Ruso",
    "Balinés",
    "Bengalí",
    "Birmano",
    "Bobtail Japonés",
    "Bombay",
    "British Shorthair",
    "Burmés",
    "Burmilla",
    "Chartreux",
    "Común Europeo",
    "Cornish Rex",
    "Devon Rex",
    "Egipcio Mau",
    "Exótico de Pelo Corto",
    "Fold Escocés (Scottish Fold)",
    "Gato de Bengala",
    "Gato Doméstico (Mestizo)",
    "Gato Montés",
    "Habana Brown",
    "Himalayo",
    "Korat",
    "LaPerm",
    "Maine Coon",
    "Manx",
    "Mestizo",
    "Munchkin",
    "Nebelung",
    "Noruego de Bosque",
    "Ocicat",
    "Oriental",
    "Persa",
    "Peterbald",
    "Pixie Bob",
    "Ragdoll",
    "Sagrado de Birmania",
    "Savannah",
    "Selkirk Rex",
    "Siamés",
    "Siberiano",
    "Singapura",
    "Snowshoe",
    "Somalí",
    "Sphynx (Esfinge)",
    "Tonkinés",
    "Toyger",
    "Van Turco"
];

// Función para calcular gramos diarios de alimento según peso
function calcularAlimentoDiario(peso, edad, especie) {
    if (!peso || peso <= 0) return 0;
    
    let porcentajePeso;
    
    if (especie === 'Canino') {
        // Perros
        if (edad <= 1) {
            // Cachorros: 3-4% del peso corporal
            porcentajePeso = 3.5;
        } else if (edad <= 7) {
            // Adultos: 2-3% del peso corporal
            if (peso < 10) {
                porcentajePeso = 3; // Razas pequeñas comen más proporcionalmente
            } else if (peso < 25) {
                porcentajePeso = 2.5;
            } else {
                porcentajePeso = 2; // Razas grandes
            }
        } else {
            // Seniors: 1.5-2.5% del peso corporal
            porcentajePeso = 2;
        }
    } else {
        // Gatos
        if (edad <= 1) {
            // Gatitos: 4-5% del peso corporal
            porcentajePeso = 4.5;
        } else if (edad <= 7) {
            // Adultos: 2-3% del peso corporal
            porcentajePeso = 2.5;
        } else {
            // Seniors: 2-2.5% del peso corporal
            porcentajePeso = 2.2;
        }
    }
    
    // Calcular gramos diarios
    const gramosDiarios = (peso * 1000 * porcentajePeso) / 100;
    
    return Math.round(gramosDiarios);
}

// Función para calcular días restantes de alimento
function calcularDiasRestantes(pesoBolsaKg, gramosDiarios, fechaInicio) {
    if (!pesoBolsaKg || !gramosDiarios || gramosDiarios <= 0) return null;
    
    const pesoTotalGramos = pesoBolsaKg * 1000;
    const diasTotales = Math.floor(pesoTotalGramos / gramosDiarios);
    
    if (!fechaInicio) {
        return { diasTotales, diasRestantes: diasTotales, porcentajeRestante: 100 };
    }
    
    const inicio = new Date(fechaInicio);
    const hoy = new Date();
    const diasTranscurridos = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.max(0, diasTotales - diasTranscurridos);
    const porcentajeRestante = Math.round((diasRestantes / diasTotales) * 100);
    
    return {
        diasTotales,
        diasTranscurridos,
        diasRestantes,
        porcentajeRestante
    };
}
