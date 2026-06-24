import Anthropic from "@anthropic-ai/sdk";

export type SupportedCountry = "GB" | "US" | "AU" | "CA";

export const COUNTRY_LABELS: Record<SupportedCountry, string> = {
  GB: "United Kingdom",
  US: "United States",
  AU: "Australia",
  CA: "Canada",
};

export interface DecoyPersona {
  country: SupportedCountry;
  name: { first: string; last: string; full: string };
  address: { line1: string; line2: string; town: string; postcode: string; full: string };
  phone: string;
  email: string;
  dob: string;
  card: { number: string; expiry: string; cvv: string; type: "Visa" | "Mastercard" };
  bankDetails: Record<string, string>; // country-specific: sortCode+accountNumber / routingNumber+accountNumber / BSB+accountNumber / transitNumber+accountNumber
  nationalId: { label: string; value: string }; // NI / SSN / TFN / SIN
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

function randDigits(n: number): string {
  return Array.from({ length: n }, () => randInt(0, 9)).join("");
}

// Luhn: append check digit to a partial number string
function luhnComplete(partial: string): string {
  const digits = partial.split("").map(Number);
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    const posFromRight = digits.length - i + 1;
    if (posFromRight % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return partial + ((10 - (sum % 10)) % 10);
}

function generateCard(): DecoyPersona["card"] {
  const isVisa = Math.random() < 0.6;
  const prefix = isVisa
    ? "4" + pad(randInt(100, 999), 3) + pad(randInt(100, 999), 3)
    : "5" + pad(randInt(100, 399), 3) + pad(randInt(100, 999), 3);
  const number = luhnComplete(prefix + randDigits(8));
  const expMonth = pad(randInt(1, 12));
  const expYear = pad((new Date().getFullYear() + randInt(1, 4)) % 100);
  return {
    number: number.replace(/(.{4})/g, "$1 ").trim(),
    expiry: `${expMonth}/${expYear}`,
    cvv: pad(randInt(100, 999), 3),
    type: isVisa ? "Visa" : "Mastercard",
  };
}

function dobYear(): number { return randInt(1948, 1980); }

// ---------------------------------------------------------------------------
// Per-country data
// ---------------------------------------------------------------------------

const NAMES: Record<SupportedCountry, { first: string[]; last: string[] }> = {
  GB: {
    first: [
      "Sarah","Margaret","Susan","Linda","Patricia","Karen","Helen","Janet","Julie","Diane",
      "Barbara","Christine","Angela","Carol","Shirley","Sandra","Wendy","Pauline","Janice","Deborah",
      "Brian","David","Michael","Robert","John","Peter","Gary","Kevin","Stephen","Paul",
      "Andrew","Mark","Richard","Philip","Graham","Neil","Ian","Colin","Derek","Barry",
    ],
    last: [
      "Smith","Jones","Williams","Taylor","Brown","Davies","Evans","Wilson","Thomas","Roberts",
      "Johnson","Walker","Wright","Robinson","Thompson","White","Hughes","Edwards","Green","Hall",
      "Lewis","Harris","Clarke","Patel","Jackson","Wood","Turner","Martin","Cooper","Hill",
    ],
  },
  US: {
    first: [
      "Jennifer","Patricia","Linda","Barbara","Susan","Jessica","Sarah","Karen","Lisa","Nancy",
      "Betty","Dorothy","Sandra","Ashley","Kimberly","Donna","Carol","Michelle","Emily","Amanda",
      "James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles",
      "Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew","Kenneth",
    ],
    last: [
      "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Anderson",
      "Taylor","Thomas","Hernandez","Moore","Martin","Jackson","Thompson","White","Lopez","Lee",
      "Harris","Clark","Lewis","Robinson","Walker","Hall","Young","Allen","King","Wright",
    ],
  },
  AU: {
    first: [
      "Jessica","Sarah","Emily","Emma","Olivia","Chloe","Megan","Lauren","Rebecca","Stephanie",
      "Natalie","Samantha","Michelle","Katherine","Nicole","Matthew","James","Joshua","Daniel","Michael",
      "Andrew","Ryan","David","Christopher","Nathan","Benjamin","Thomas","Adam","Luke","Jack",
    ],
    last: [
      "Smith","Jones","Williams","Brown","Wilson","Taylor","Johnson","White","Martin","Anderson",
      "Thompson","Nguyen","Harris","Walker","Robinson","Li","Murphy","Davis","Lee","King",
      "Green","Mitchell","Baker","Turner","Clarke","Campbell","Evans","Edwards","Collins","Stewart",
    ],
  },
  CA: {
    first: [
      "Emma","Olivia","Sophia","Isabella","Ava","Mia","Emily","Charlotte","Abigail","Harper",
      "Liam","Noah","William","Benjamin","James","Logan","Mason","Elijah","Oliver","Jacob",
      "Ethan","Lucas","Aiden","Jackson","Sebastian","Carter","Owen","Wyatt","Isaiah","Connor",
    ],
    last: [
      "Smith","Brown","Tremblay","Martin","Roy","Wilson","Macdonald","Gagnon","Johnson","Taylor",
      "Bouchard","Cote","Leblanc","Campbell","Anderson","Jones","Morin","Lavoie","Fortin","Gauthier",
      "Robinson","Thompson","White","Harris","Clark","Lewis","Walker","Lee","Hall","Young",
    ],
  },
};

// [streetSuffixes, cities/towns] per country
const ADDRESS_DATA: Record<SupportedCountry, { streets: string[]; places: [string, string][] }> = {
  GB: {
    streets: [
      "High Street","Church Lane","Station Road","Victoria Road","Mill Lane","Green Lane",
      "School Road","Meadow Way","Oak Avenue","The Crescent","Elm Close","Park Drive",
      "Birch Road","Cedar Avenue","Maple Close","Willow Lane","Ash Grove","Poplar Road",
    ],
    // [town, postcode area code]
    places: [
      ["Wolverhampton","WV"],["Coventry","CV"],["Leicester","LE"],["Nottingham","NG"],
      ["Derby","DE"],["Sheffield","S"],["Bradford","BD"],["Leeds","LS"],["Sunderland","SR"],
      ["Middlesbrough","TS"],["Preston","PR"],["Blackpool","FY"],["Burnley","BB"],
      ["Stockport","SK"],["Wigan","WN"],["Bolton","BL"],["Oldham","OL"],["Rochdale","OL"],
    ],
  },
  US: {
    streets: [
      "Maple Street","Oak Avenue","Cedar Lane","Pine Road","Elm Street","Walnut Drive",
      "Main Street","Park Avenue","Lake Drive","River Road","Sunset Boulevard","Spring Lane",
      "Hillcrest Drive","Valley Road","Forest Avenue","Meadow Lane","Brook Street","Church Road",
    ],
    // [city, state abbreviation]
    places: [
      ["Columbus","OH"],["Indianapolis","IN"],["Charlotte","NC"],["Memphis","TN"],["Louisville","KY"],
      ["Baltimore","MD"],["Milwaukee","WI"],["Albuquerque","NM"],["Tucson","AZ"],["Fresno","CA"],
      ["Sacramento","CA"],["Mesa","AZ"],["Omaha","NE"],["Cleveland","OH"],["Raleigh","NC"],
      ["Virginia Beach","VA"],["Colorado Springs","CO"],["Arlington","TX"],["Bakersfield","CA"],["Aurora","CO"],
    ],
  },
  AU: {
    streets: [
      "Gum Tree Road","Wattle Avenue","Banksia Close","Eucalyptus Drive","Acacia Street",
      "Waratah Way","Kangaroo Lane","Koala Court","Bottlebrush Place","Paperbark Drive",
      "Grevillea Street","Melaleuca Road","Angophora Avenue","Hakea Close","Lilly Pilly Lane",
    ],
    // [suburb, state]
    places: [
      ["Parramatta","NSW"],["Penrith","NSW"],["Geelong","VIC"],["Ballarat","VIC"],["Bendigo","VIC"],
      ["Townsville","QLD"],["Cairns","QLD"],["Toowoomba","QLD"],["Launceston","TAS"],["Hobart","TAS"],
      ["Mandurah","WA"],["Bunbury","WA"],["Alice Springs","NT"],["Mackay","QLD"],["Rockhampton","QLD"],
    ],
  },
  CA: {
    streets: [
      "Maple Avenue","Birch Street","Cedar Drive","Pine Crescent","Oak Boulevard","Elm Road",
      "Lakeshore Drive","Mountain View Road","Ridgeway Avenue","Heritage Lane","Parkside Drive",
      "Riverside Road","Clearview Avenue","Westbrook Drive","Northfield Road","Southgate Avenue",
    ],
    // [city, province]
    places: [
      ["Hamilton","ON"],["Kitchener","ON"],["London","ON"],["St. Catharines","ON"],["Halifax","NS"],
      ["Victoria","BC"],["Kelowna","BC"],["Abbotsford","BC"],["Saskatoon","SK"],["Regina","SK"],
      ["Red Deer","AB"],["Lethbridge","AB"],["Barrie","ON"],["Sudbury","ON"],["Sherbrooke","QC"],
    ],
  },
};

const EMAIL_PROVIDERS: Record<SupportedCountry, string[]> = {
  GB: ["hotmail.co.uk","gmail.com","yahoo.co.uk","btinternet.com","sky.com","talktalk.net"],
  US: ["gmail.com","yahoo.com","hotmail.com","aol.com","outlook.com","comcast.net"],
  AU: ["gmail.com","yahoo.com.au","hotmail.com","bigpond.com","optusnet.com.au","iinet.net.au"],
  CA: ["gmail.com","yahoo.ca","hotmail.com","shaw.ca","rogers.com","bell.net"],
};

// ---------------------------------------------------------------------------
// Country-specific generators
// ---------------------------------------------------------------------------

function gbPhone(): string {
  // Ofcom drama/fiction range 07700 900000–900999 — never a real subscriber
  return `07700 9${pad(randInt(0, 9))}${pad(randInt(0, 9))} ${pad(randInt(0, 9))}${pad(randInt(0, 9))}${randInt(0, 9)}`;
}

function usPhone(): string {
  // NANP fictional range: (555) 010x — reserved for drama/fiction use
  return `(555) 010${randInt(0, 9)}-${pad(randInt(1000, 9999), 4)}`;
}

function auPhone(): string {
  // ACMA fictitious-use mobile range 0491 570 xxx / 0491 571 xxx — reserved for
  // film/TV/radio drama and never assigned to a real subscriber. Keeps a valid
  // 04 mobile look while guaranteeing we never hand a scammer a real number.
  return `0491 57${randInt(0, 1)} ${pad(randInt(0, 999), 3)}`;
}

function caPhone(): string {
  // NANP fictional range same as US
  return `(555) 010${randInt(0, 9)}-${pad(randInt(1000, 9999), 4)}`;
}

function gbPostcode(areaCode: string): string {
  const letters = "ABDEFGHJLNPQRSTUVWXYZ";
  return `${areaCode}${randInt(1, 9)} ${randInt(1, 9)}${letters[randInt(0, letters.length - 1)]}${letters[randInt(0, letters.length - 1)]}`;
}

function usZip(): string {
  // Use ZIP ranges that exist but avoid obviously fake 00000
  return pad(randInt(10000, 99999), 5);
}

function auPostcode(): string {
  return pad(randInt(2000, 7999), 4);
}

function caPostcode(): string {
  const letters = "ABCEGHJKLMNPRSTVXY";
  const l1 = letters[randInt(0, letters.length - 1)];
  const l2 = letters[randInt(0, letters.length - 1)];
  const l3 = letters[randInt(0, letters.length - 1)];
  return `${l1}${randInt(1, 9)}${l2} ${randInt(1, 9)}${l3}${randInt(1, 9)}`;
}

function gbNationalId(): { label: string; value: string } {
  const INVALID_FIRST = new Set(["D","F","I","Q","U","V"]);
  const INVALID_SECOND = new Set(["D","F","I","O","Q","U","V"]);
  const INVALID_PREFIXES = new Set(["BG","GB","NK","KN","NT","TN","ZZ"]);
  const alpha = "ABCEHIJKLMNPRSTW";
  let first: string, second: string;
  do {
    first = alpha[randInt(0, alpha.length - 1)];
    second = alpha[randInt(0, alpha.length - 1)];
  } while (
    INVALID_FIRST.has(first) ||
    INVALID_SECOND.has(second) ||
    INVALID_PREFIXES.has(first + second)
  );
  return {
    label: "National Insurance Number",
    value: `${first}${second}${randDigits(6)}${pick(["A","B","C","D"])}`,
  };
}

function usNationalId(): { label: string; value: string } {
  // SSN area 900–999 = never issued (safe fake range)
  return {
    label: "Social Security Number",
    value: `9${pad(randInt(0, 9))}${randInt(0, 9)}-${pad(randInt(10, 99))}-${pad(randInt(1000, 9999), 4)}`,
  };
}

function auNationalId(): { label: string; value: string } {
  // TFN: 8 or 9 digits. Weights: 1,4,3,7,5,8,6,9,10. Sum % 11 == 0.
  // Generate 8 random digits, compute check digit via weighted sum.
  const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10];
  let digits: number[];
  let check: number;
  do {
    digits = Array.from({ length: 8 }, () => randInt(0, 9));
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
    // The check digit sits at weight 10 ≡ -1 (mod 11), so for the full TFN to be
    // divisible by 11 the check digit must equal sum % 11 (not its negation).
    check = sum % 11;
  } while (check === 10); // 10 can't be a single digit — regenerate
  const tfn = [...digits, check].join("");
  return {
    label: "Tax File Number",
    value: `${tfn.slice(0, 3)} ${tfn.slice(3, 6)} ${tfn.slice(6)}`,
  };
}

function caNationalId(): { label: string; value: string } {
  // SIN: 9 digits, Luhn-valid. First digit 9 = temporary resident (safe test range).
  const partial = "9" + randDigits(7);
  return {
    label: "Social Insurance Number",
    value: luhnComplete(partial).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
  };
}

function gbBankDetails(): Record<string, string> {
  return {
    "Sort Code": `${pad(randInt(10, 99))}-${pad(randInt(10, 99))}-${pad(randInt(10, 99))}`,
    "Account Number": randDigits(8),
  };
}

function usBankDetails(): Record<string, string> {
  // ABA routing number: 9 digits with checksum (3*d1 + 7*d2 + d3 + ...) % 10 == 0
  let routing: string;
  do {
    const d = Array.from({ length: 8 }, () => randInt(0, 9));
    const sum = 3*d[0] + 7*d[1] + d[2] + 3*d[3] + 7*d[4] + d[5] + 3*d[6] + 7*d[7];
    const check = (10 - (sum % 10)) % 10;
    routing = d.join("") + check;
  } while (routing[0] === "0"); // routing numbers don't start with 0
  return {
    "Routing Number": routing,
    "Account Number": randDigits(randInt(8, 12)),
  };
}

function auBankDetails(): Record<string, string> {
  return {
    "BSB": `${pad(randInt(10, 99))}${pad(randInt(10, 99))}${pad(randInt(10, 99))}`.replace(/(\d{3})(\d{3})/, "$1-$2"),
    "Account Number": randDigits(randInt(6, 9)),
  };
}

function caBankDetails(): Record<string, string> {
  return {
    "Institution Number": pad(randInt(1, 999), 3),
    "Transit Number": pad(randInt(10000, 99999), 5),
    "Account Number": randDigits(randInt(7, 12)),
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generatePersona(country: SupportedCountry = "GB"): DecoyPersona {
  const names = NAMES[country];
  const addressData = ADDRESS_DATA[country];
  const first = pick(names.first);
  const last = pick(names.last);
  const [town, regionCode] = pick(addressData.places);
  const houseNumber = randInt(1, 180);
  const street = pick(addressData.streets);

  let postcode: string;
  if (country === "GB") postcode = gbPostcode(regionCode);
  else if (country === "US") postcode = `${regionCode} ${usZip()}`;
  else if (country === "AU") postcode = `${regionCode} ${auPostcode()}`;
  else postcode = caPostcode();

  const year = dobYear();
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  const dob = country === "US"
    ? `${pad(month)}/${pad(day)}/${year}`
    : `${pad(day)}/${pad(month)}/${year}`;

  const emailSuffix = Math.random() < 0.4 ? String(year) : "";
  const email = `${first.toLowerCase()}.${last.toLowerCase()}${emailSuffix}@${pick(EMAIL_PROVIDERS[country])}`;

  let phone: string;
  if (country === "GB") phone = gbPhone();
  else if (country === "US") phone = usPhone();
  else if (country === "AU") phone = auPhone();
  else phone = caPhone();

  let nationalId: { label: string; value: string };
  if (country === "GB") nationalId = gbNationalId();
  else if (country === "US") nationalId = usNationalId();
  else if (country === "AU") nationalId = auNationalId();
  else nationalId = caNationalId();

  let bankDetails: Record<string, string>;
  if (country === "GB") bankDetails = gbBankDetails();
  else if (country === "US") bankDetails = usBankDetails();
  else if (country === "AU") bankDetails = auBankDetails();
  else bankDetails = caBankDetails();

  return {
    country,
    name: { first, last, full: `${first} ${last}` },
    address: {
      line1: `${houseNumber} ${street}`,
      line2: "",
      town,
      postcode,
      full: `${houseNumber} ${street}, ${town}, ${postcode}`,
    },
    phone,
    email,
    dob,
    card: generateCard(),
    bankDetails,
    nationalId,
  };
}

// ---------------------------------------------------------------------------
// Reply generator
// ---------------------------------------------------------------------------

const NATIONALITY_LABEL: Record<SupportedCountry, string> = {
  GB: "British",
  US: "American",
  AU: "Australian",
  CA: "Canadian",
};

let anthropicClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  if (!anthropicClient) anthropicClient = new Anthropic();
  return anthropicClient;
}

export async function generateDecoyReply(opts: {
  scamEmailContent: string;
  persona: DecoyPersona;
}): Promise<string> {
  const { scamEmailContent, persona } = opts;
  const nationality = NATIONALITY_LABEL[persona.country];

  const msg = await getClient().messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    system: `You write email replies from a real-seeming but confused older ${nationality} person who has received a scam email and is taking it at face value.
Your goal is to waste the scammer's time as long as possible.
Rules:
- Sound genuinely naive and hopeful, not suspicious
- Sprinkle in small realistic personal details (job, daily life, family)
- Include an occasional mild mistake or non-sequitur to seem authentic
- Do NOT include financial details unless the scammer explicitly asked for them — tease slowly
- Keep it under 120 words
- No subject line, just the body`,
    messages: [
      {
        role: "user",
        content: `The scammer sent this:\n\n"${scamEmailContent}"\n\nWrite a reply from ${persona.name.full}, who lives in ${persona.address.town}. They are genuinely interested and want to know more.`,
      },
    ],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text : "";
}
