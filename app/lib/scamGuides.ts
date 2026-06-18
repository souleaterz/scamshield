export interface ScamFaq {
  question: string;
  answer: string;
}

export interface ScamGuide {
  slug: string;
  /** Short human name, e.g. "Royal Mail delivery scam". */
  name: string;
  /** Grouping label shown on cards. */
  category: string;
  metaTitle: string;
  metaDescription: string;
  /** One or two sentence lede. */
  intro: string;
  /** How the scam typically plays out. */
  howItWorks: string;
  warningSigns: string[];
  whatToDo: string[];
  /** A representative (fake) message, shown as an example. */
  exampleMessage?: string;
  faqs: ScamFaq[];
}

export const SCAM_GUIDES: ScamGuide[] = [
  {
    slug: "royal-mail-delivery-scam",
    name: "Royal Mail delivery text scam",
    category: "Delivery & parcels",
    metaTitle: "Royal Mail Text Scam: How to Spot the Fake Delivery Message",
    metaDescription:
      "Got a Royal Mail text asking for a small redelivery fee? Learn how the parcel delivery scam works, the warning signs, and what to do.",
    intro:
      "A fake Royal Mail text says your parcel is held until you pay a small redelivery or customs fee, linking to a convincing but fake payment page.",
    howItWorks:
      "Scammers send a mass text impersonating Royal Mail claiming a delivery failed or a tiny fee (often around £1–£3) is due. The link leads to a lookalike site that harvests your card details and personal information. The small fee makes it feel low-risk, but the real goal is your full card and banking details.",
    warningSigns: [
      "An unexpected text about a parcel you weren't expecting",
      "A small, oddly specific fee to 'release' the delivery",
      "A link to a domain that isn't royalmail.com (e.g. royalmail-redelivery.com)",
      "Pressure to pay quickly or the parcel will be returned",
      "Requests for card details, date of birth, or address via the link",
    ],
    whatToDo: [
      "Don't tap the link or enter any details",
      "Check tracking only at royalmail.com or in the official app",
      "Forward the text to 7726 (free spam reporting) then delete it",
      "If you entered card details, call your bank immediately",
    ],
    exampleMessage:
      "Royal Mail: Your parcel is awaiting redelivery. A £1.45 fee is required: http://royalmail-redelivery-secure.com/pay",
    faqs: [
      {
        question: "Does Royal Mail ever charge fees by text?",
        answer:
          "Royal Mail will leave a 'Something for You' card or use the official app for genuine fees such as customs charges. It does not send payment links by text demanding a small fee to release a parcel.",
      },
      {
        question: "I paid the fee — what should I do?",
        answer:
          "Contact your bank right away to stop the payment and protect your card, change any reused passwords, and watch for further suspicious activity. Report it to Action Fraud.",
      },
    ],
  },
  {
    slug: "hmrc-tax-refund-scam",
    name: "HMRC tax refund scam",
    category: "Government & tax",
    metaTitle: "HMRC Tax Refund Scam: Spotting Fake Refund Texts & Emails",
    metaDescription:
      "A message says HMRC owes you a tax refund and you just need to 'claim' it. Here's how the HMRC refund scam works and how to stay safe.",
    intro:
      "A text, email, or call claims HMRC owes you a refund and asks you to click a link and enter bank or card details to 'claim' it.",
    howItWorks:
      "Fraudsters impersonate HMRC with the promise of money owed to you — a powerful hook. The link leads to a fake gov.uk-style page asking for your bank details, card number, and personal information, which are then used for theft or sold on.",
    warningSigns: [
      "An unexpected message promising a tax refund",
      "A link that isn't on the official gov.uk domain",
      "Requests for bank, card, or login details to 'receive' money",
      "Urgency such as 'claim within 24 hours or lose your refund'",
      "Poor grammar or a generic greeting like 'Dear customer'",
    ],
    whatToDo: [
      "Never enter details from a link in the message",
      "Log in to your HMRC account directly via gov.uk to check",
      "Forward suspicious texts to 60599 and emails to phishing@hmrc.gov.uk",
      "Report it to Action Fraud if you've lost money",
    ],
    exampleMessage:
      "HMRC: You are due a tax refund of £278.40. Claim now before it expires: http://hmrc-refund-claim.co/gov",
    faqs: [
      {
        question: "Does HMRC text or email about refunds?",
        answer:
          "HMRC does not notify you of refunds, or ask for personal or payment details, by text or email. Genuine refunds appear in your online HMRC account or are sent automatically.",
      },
    ],
  },
  {
    slug: "hi-mum-whatsapp-scam",
    name: "'Hi Mum' WhatsApp scam",
    category: "Impersonation",
    metaTitle: "'Hi Mum' WhatsApp Scam: The Fake Family Emergency Message",
    metaDescription:
      "A message from an unknown number claims to be your child who has lost their phone and urgently needs money. Learn the 'Hi Mum' scam signs.",
    intro:
      "Someone messages from an unknown number pretending to be your son or daughter who has 'lost their phone', then asks you to urgently send money.",
    howItWorks:
      "The scammer poses as a family member texting from a 'new number', builds a quick sense of trust and urgency (a bill that must be paid today, locked out of online banking), and asks you to transfer money to an account that isn't really theirs.",
    warningSigns: [
      "A message from an unknown number claiming to be a relative",
      "A story about a lost, broken, or replaced phone",
      "Urgent request to pay a bill or transfer money today",
      "Reluctance to take a phone call to confirm",
      "New bank details you don't recognise",
    ],
    whatToDo: [
      "Call the person on their known number before doing anything",
      "Never transfer money based on a text alone",
      "Verify with another family member if you can't reach them",
      "Report it to your bank and to Action Fraud if you've paid",
    ],
    exampleMessage:
      "Hi mum, I dropped my phone down the toilet so I'm texting from a new number. I can't log into my banking — can you pay a bill for me? I'll send the details.",
    faqs: [
      {
        question: "How can I be sure it's really my family member?",
        answer:
          "Call them on the number you already have saved, or ask a question only they would know the answer to. Genuine relatives won't mind you checking.",
      },
    ],
  },
  {
    slug: "paypal-account-phishing",
    name: "PayPal account phishing",
    category: "Account phishing",
    metaTitle: "PayPal Phishing Scam: Fake 'Account Limited' Emails Explained",
    metaDescription:
      "An email says your PayPal account is limited or a payment was made, urging you to log in via a link. Here's how to spot PayPal phishing.",
    intro:
      "A fake PayPal email warns that your account is limited, or that an unexpected payment went out, and pushes you to 'log in' through a link.",
    howItWorks:
      "The email mimics PayPal branding and creates alarm — your account is restricted, or money has left it. The link leads to a fake login page that captures your email and password, giving scammers access to your real account.",
    warningSigns: [
      "An email about a payment or 'limitation' you didn't expect",
      "A login link that isn't on paypal.com",
      "Generic greetings instead of your name",
      "Threats that your account will be closed unless you act now",
      "Attachments or 'invoices' you didn't request",
    ],
    whatToDo: [
      "Don't click the link — open the PayPal app or type paypal.com yourself",
      "Check your account and notifications directly",
      "Forward phishing emails to spoof@paypal.com",
      "Turn on two-factor authentication on your account",
    ],
    exampleMessage:
      "PayPal: Your account has been limited due to unusual activity. Log in within 24 hours to restore access: http://paypal-secure-login.com",
    faqs: [
      {
        question: "How do I check if a PayPal email is real?",
        answer:
          "Don't trust links in the email. Log in to PayPal directly through the app or by typing paypal.com — genuine alerts and any required actions also appear inside your account.",
      },
    ],
  },
  {
    slug: "bank-impersonation-call",
    name: "Bank impersonation (safe account) scam",
    category: "Impersonation",
    metaTitle: "Bank Scam Call: The 'Move Your Money to a Safe Account' Trick",
    metaDescription:
      "A caller claims to be from your bank's fraud team and says you must move money to a 'safe account'. Learn why this is always a scam.",
    intro:
      "A caller or text claims to be your bank's fraud team, says your account is at risk, and tells you to move your money to a new 'safe account'.",
    howItWorks:
      "The scammer may spoof your bank's real number and quote some details to sound convincing. They create panic about fraud on your account, then direct you to transfer your balance to an account they control — framing it as protecting your money.",
    warningSigns: [
      "Pressure to act immediately because your money is 'at risk'",
      "Being told to move funds to a new or 'safe' account",
      "Requests for your PIN, full password, or one-time passcodes",
      "Being told to keep the call secret or not hang up",
      "A caller discouraging you from visiting a branch",
    ],
    whatToDo: [
      "Hang up — no genuine bank asks you to move money to a safe account",
      "Wait a few minutes, then call your bank on the number on your card",
      "Never share PINs, passwords, or one-time codes",
      "Report it to your bank and Action Fraud",
    ],
    exampleMessage:
      "This is the fraud team at your bank. We've detected suspicious activity. To protect your funds, please transfer your balance to the safe account we'll provide.",
    faqs: [
      {
        question: "Would my bank ever ask me to move money to a safe account?",
        answer:
          "No. This is one of the clearest signs of a scam. Banks will never ask you to move money to another account to keep it safe, nor ask for your PIN or full password.",
      },
    ],
  },
  {
    slug: "crypto-investment-scam",
    name: "Crypto investment scam",
    category: "Investment",
    metaTitle: "Crypto Investment Scam: Spotting Fake 'Guaranteed Returns'",
    metaDescription:
      "An ad, message, or 'advisor' promises big guaranteed crypto returns. Learn how investment scams work and the red flags to watch for.",
    intro:
      "A message, social media ad, or 'advisor' promises high, guaranteed returns from crypto trading — often using fake celebrity endorsements.",
    howItWorks:
      "Victims are drawn in by promises of fast, guaranteed profit, sometimes via a slick fake trading platform. Early small 'withdrawals' may be allowed to build trust, but larger deposits vanish, and 'fees' are demanded before any payout that never comes.",
    warningSigns: [
      "Guaranteed or unrealistically high returns",
      "Pressure to invest quickly or 'miss out'",
      "Unsolicited contact from a 'broker' or via social media",
      "Fake celebrity endorsements or testimonials",
      "Being asked to pay fees before you can withdraw",
    ],
    whatToDo: [
      "Don't send money or crypto to anyone promising guaranteed returns",
      "Check the firm on the FCA register and Warning List",
      "Be sceptical of anyone who contacts you out of the blue",
      "Report it to Action Fraud and the FCA",
    ],
    exampleMessage:
      "Join our exclusive crypto programme — our members earn 20% weekly, guaranteed. Limited spots! Deposit today and watch your money grow.",
    faqs: [
      {
        question: "Are guaranteed crypto returns ever real?",
        answer:
          "No legitimate investment can guarantee returns, and crypto is highly volatile. A promise of guaranteed or fixed high returns is one of the strongest signs of a scam.",
      },
    ],
  },
];

export function getGuide(slug: string): ScamGuide | undefined {
  return SCAM_GUIDES.find((g) => g.slug === slug);
}
