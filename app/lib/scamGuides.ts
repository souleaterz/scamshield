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
  {
    slug: "amazon-prime-account-scam",
    name: "Amazon Prime & account scam",
    category: "Account & shopping",
    metaTitle: "Amazon Scam Calls & Texts: How to Spot the Fake Amazon Message",
    metaDescription:
      "Got a call or text about an Amazon order you didn't make, or a Prime renewal? Learn how the Amazon impersonation scam works and how to stay safe.",
    intro:
      "Scammers impersonate Amazon by phone, text, or email claiming there's a problem with your account, a suspicious order, or an automatic Prime renewal — to trick you into handing over card details or remote access to your device.",
    howItWorks:
      "You receive an automated call, text, or email saying your Amazon Prime is about to auto-renew for a large amount, that an expensive order has been placed, or that your account is locked. Pressing a number or tapping a link connects you to a fake 'Amazon support' agent who either takes your card details to 'cancel' the charge, or talks you into installing remote-access software so they can drain your bank account.",
    warningSigns: [
      "An unexpected call or text about an order or Prime renewal you don't recognise",
      "Being asked to 'press 1' to speak to an agent",
      "Pressure to act fast before money leaves your account",
      "A request to install an app (e.g. AnyDesk, TeamViewer) so they can 'help'",
      "Being asked for your card details, PIN, or one-time passcode",
      "A link to a site that isn't amazon.co.uk",
    ],
    whatToDo: [
      "Hang up or delete the message — Amazon won't cold-call you about orders",
      "Check orders only by logging in at amazon.co.uk or the official app",
      "Never install remote-access software at the request of a caller",
      "Never share a one-time passcode with anyone, even 'Amazon'",
      "If you gave card or bank details, call your bank immediately",
    ],
    exampleMessage:
      "AMAZON: Your Prime membership will auto-renew today for £79.99. To cancel, call 0800 XXX XXXX or visit amazon-billing-help.com",
    faqs: [
      {
        question: "Does Amazon call you about suspicious orders?",
        answer:
          "No. Amazon will not phone you out of the blue to ask for payment details, passcodes, or remote access. Any genuine issue can be seen and managed by signing into your account directly.",
      },
      {
        question: "I pressed 1 and spoke to someone — am I at risk?",
        answer:
          "Just speaking to them isn't harmful, but don't share any details, install anything, or move money. If you did, contact your bank and change your Amazon password from a device you trust.",
      },
    ],
  },
  {
    slug: "dpd-evri-delivery-scam",
    name: "DPD & Evri delivery scam",
    category: "Delivery & parcels",
    metaTitle: "DPD & Evri Scam Text: Spot the Fake Parcel Delivery Message",
    metaDescription:
      "Got a DPD or Evri text about a missed delivery or a small fee? Learn how the courier scam works, the warning signs, and what to do.",
    intro:
      "Fake DPD and Evri (formerly Hermes) texts claim your parcel couldn't be delivered or needs a small fee or address confirmation, linking to a convincing but fake site that steals your card and personal details.",
    howItWorks:
      "Scammers send mass texts impersonating couriers, knowing many people are genuinely expecting a parcel. The message says a delivery failed, your address needs confirming, or a small fee is due, and links to a lookalike site. Once you enter card details, they take a small payment to set up a recurring scam charge — or use your details and a follow-up 'bank' call to empty your account.",
    warningSigns: [
      "A delivery text for a parcel you weren't expecting, or from a courier you didn't use",
      "A request to pay a small 'redelivery' or 'customs' fee",
      "A link to a domain that isn't dpd.co.uk or evri.com",
      "Spelling mistakes, odd characters, or a sense of urgency",
      "A form asking for full card details and personal information",
    ],
    whatToDo: [
      "Don't tap the link — track parcels in the official DPD or Evri app or website",
      "Check the sender and the link domain carefully",
      "Forward the text to 7726 to report it, then delete it",
      "If you entered details, contact your bank and watch for a follow-up 'bank' call (that call is part of the scam)",
    ],
    exampleMessage:
      "Evri: We were unable to deliver your parcel. Please confirm your details and pay the £1.99 redelivery fee: evri-redelivery-uk.com",
    faqs: [
      {
        question: "Do DPD or Evri charge redelivery fees by text?",
        answer:
          "Genuine couriers may charge official customs fees on international parcels, but they direct you to their real website or app — they don't send unexpected payment links by text for small redelivery fees.",
      },
      {
        question: "The tracking number looks real — does that mean it's safe?",
        answer:
          "No. Scammers add realistic-looking tracking numbers to make texts believable. Always verify by typing the courier's official website address yourself rather than tapping the link.",
      },
    ],
  },
  {
    slug: "dvla-vehicle-tax-scam",
    name: "DVLA vehicle tax & refund scam",
    category: "Government & tax",
    metaTitle: "DVLA Scam Text & Email: Fake Vehicle Tax and Refund Messages",
    metaDescription:
      "Got a DVLA text or email about a failed car tax payment or a refund? Learn how the DVLA scam works, the red flags, and what to do.",
    intro:
      "Scammers impersonate the DVLA with texts and emails about a failed vehicle tax payment, a refund you're owed, or your car being 'untaxed' — to harvest your card and personal details.",
    howItWorks:
      "The message claims your latest car tax payment failed, your vehicle is no longer taxed, or you're due a refund, and links to a fake DVLA page. It asks for your card and personal details to 'fix' the payment or 'release' the refund. The official-looking branding and the fear of a fine make people act without checking.",
    warningSigns: [
      "A text or email saying your vehicle tax failed or you're owed a refund",
      "A link to a site that isn't gov.uk",
      "Requests for card details, bank details, or your driving licence number",
      "Threats of a fine, penalty, or your vehicle being clamped",
      "Generic greetings and a sense of urgency",
    ],
    whatToDo: [
      "Don't tap the link — the DVLA only uses gov.uk",
      "Check or pay vehicle tax directly at gov.uk/vehicle-tax",
      "Report scam texts to 7726 and forward scam emails to report@phishing.gov.uk",
      "If you entered card details, call your bank straight away",
    ],
    exampleMessage:
      "DVLA: Our records show your vehicle is no longer taxed. Avoid a £1,000 fine by updating your details: gov-uk-vehicletax.com/pay",
    faqs: [
      {
        question: "Does the DVLA send refund or tax links by text?",
        answer:
          "No. The DVLA never sends texts or emails with links asking for payment or bank details. Genuine vehicle tax and refunds are handled only through gov.uk.",
      },
      {
        question: "How can I tell a real gov.uk link?",
        answer:
          "Real UK government services always end in gov.uk (e.g. gov.uk/vehicle-tax). Anything like 'gov-uk-tax.com' or 'dvla-refund.net' is fake.",
      },
    ],
  },
  {
    slug: "romance-scam",
    name: "Romance & catfish scam",
    category: "Dating & relationships",
    metaTitle: "Romance Scam Signs: How to Spot a Catfish or Fake Online Partner",
    metaDescription:
      "Met someone online who feels too good to be true? Learn the warning signs of a romance scam or catfish, and how to check if they're real.",
    intro:
      "In a romance scam, a fraudster builds a fake online relationship — often using stolen or AI-generated photos — to win your trust, then invents an emergency to ask you for money.",
    howItWorks:
      "Scammers create attractive fake profiles on dating apps and social media, sometimes using AI-generated faces that don't exist. They move fast emotionally, profess strong feelings quickly, and steer you off the app to private chat. They always have a reason they can't meet or video call. Eventually a crisis appears — a medical bill, a stuck shipment, a business emergency, or a 'guaranteed' crypto investment — and they ask for money, usually by bank transfer, gift cards, or crypto.",
    warningSigns: [
      "They fall for you very quickly and talk about a future together early",
      "They always have an excuse not to video call or meet in person",
      "Their photos look like a model, or feel too polished — possibly AI-generated",
      "They move the conversation to WhatsApp or email fast",
      "They eventually ask for money, gift cards, or crypto — or 'investment' help",
      "Their story has small inconsistencies that change over time",
    ],
    whatToDo: [
      "Never send money, gift cards, or crypto to someone you haven't met in person",
      "Insist on a live video call — scammers will keep making excuses",
      "Do a reverse-image search on their photos to see if they're stolen or fake",
      "Talk to a friend or family member — scammers rely on isolating you",
      "Report the profile to the platform, and to Action Fraud if you've lost money",
    ],
    exampleMessage:
      "My darling, I'm finally able to fly out to meet you, but customs are holding my bag and I need £900 to release it. You're the only one I can trust. I'll pay you back the moment I land.",
    faqs: [
      {
        question: "How can I check if someone online is real?",
        answer:
          "Ask for a live video call (not just photos), reverse-image-search their pictures, and check whether their story holds up. Guardurai's photo check can run a reverse-image search and AI deepfake detection to help tell whether a profile photo is real.",
      },
      {
        question: "They asked me to invest in crypto — is that a romance scam?",
        answer:
          "Very likely. 'Pig butchering' scams blend romance with fake crypto investing: the relationship is bait, and the 'investment platform' is fake. Never invest money on the advice of someone you met online.",
      },
    ],
  },
  {
    slug: "job-task-scam",
    name: "Job offer & task scam",
    category: "Jobs & money",
    metaTitle: "Job & Task Scam: Fake Work-From-Home and WhatsApp Job Offers",
    metaDescription:
      "Got an unexpected WhatsApp or text offering easy work-from-home money for completing tasks? Learn how the job and task scam works and how to avoid it.",
    intro:
      "Task scams lure you with messages offering easy money for simple online 'tasks' like rating products or liking videos — then trick you into depositing your own money that you never get back.",
    howItWorks:
      "You get an unsolicited WhatsApp, text, or social media message offering well-paid, flexible work doing simple tasks. At first you're paid small amounts to build trust. Then you're moved onto 'combined tasks' that require you to top up your own money to 'unlock' commissions. The balance and earnings shown on their app are fake — when you try to withdraw, you're asked to pay more 'fees' or taxes, and you never get any of it back.",
    warningSigns: [
      "An out-of-the-blue message offering easy, high-paid remote work",
      "Vague employer details and recruitment over WhatsApp or Telegram",
      "Small early payments to build your trust",
      "Being asked to deposit or 'top up' your own money to earn commission",
      "An app or website showing a growing balance you can't actually withdraw",
      "Pressure to recruit friends or act quickly",
    ],
    whatToDo: [
      "Ignore unsolicited job offers that arrive by text or WhatsApp",
      "Never pay money to get a job or to 'unlock' earnings — legitimate jobs don't work that way",
      "Don't share ID, bank details, or crypto wallet access",
      "Report the number and block it; report losses to Action Fraud",
    ],
    exampleMessage:
      "Hi! I'm Amy from a digital marketing agency. We offer part-time online work, £100–£300/day, just completing simple tasks from your phone. Interested? Reply on WhatsApp to start.",
    faqs: [
      {
        question: "Why did they pay me at first?",
        answer:
          "Small early payments are bait to make the scheme feel real and build trust before they ask you to deposit your own, much larger sums. The early 'earnings' are tiny compared to what you'll be persuaded to put in.",
      },
      {
        question: "Can I get my money back from a task scam?",
        answer:
          "It's difficult, especially if you paid by crypto or bank transfer, but report it to your bank immediately and to Action Fraud — acting fast gives the best chance of recovering funds.",
      },
    ],
  },
  {
    slug: "facebook-marketplace-scam",
    name: "Facebook Marketplace scam",
    category: "Buying & selling",
    metaTitle: "Facebook Marketplace Scams: How to Buy and Sell Safely",
    metaDescription:
      "Buying or selling on Facebook Marketplace? Learn the most common scams — fake couriers, overpayments, and verification-code tricks — and how to stay safe.",
    intro:
      "Facebook Marketplace scams target both buyers and sellers with fake payment confirmations, bogus courier fees, overpayment tricks, and links that steal your bank login.",
    howItWorks:
      "As a seller, a 'buyer' offers to pay by a courier that you've never heard of and sends a fake email saying you must pay a release fee first, or 'accidentally overpays' and asks for a refund of the difference. As a buyer, a 'seller' takes your deposit for an item that doesn't exist, or sends a fake payment-verification link that captures your bank details. Some scammers also send a code to 'verify you're real' — which is actually a way to hijack your phone number or accounts.",
    warningSigns: [
      "A buyer or seller who wants to move off Marketplace to text or WhatsApp immediately",
      "Payment via an unusual courier or service, with a 'fee' you must pay first",
      "An offer to overpay, then a request to refund the difference",
      "A 'verification code' they ask you to read back to them",
      "A deal that's far too cheap, or pressure to pay a deposit to 'hold' an item",
      "A payment-confirmation email or link that doesn't come from your real bank or PayPal",
    ],
    whatToDo: [
      "Deal in person and locally where possible; for goods, pay on collection",
      "Never pay a 'courier release fee' or refund an overpayment to a stranger",
      "Never read out a verification code sent to your phone",
      "Don't click payment-verification links — check your bank or PayPal app directly",
      "Use payment methods with buyer protection, and trust your instincts on prices that are too good to be true",
    ],
    exampleMessage:
      "Hi, I'd like to buy your item. I'll send my courier to collect and pay you via PayPal. You'll get an email to release the funds — just pay the £25 courier insurance first and I'll add it to the total.",
    faqs: [
      {
        question: "Why would a buyer ask me to pay a fee?",
        answer:
          "It's a scam. No genuine buyer needs you to pay a courier or 'insurance' fee before you receive your money. The fake email pressuring you to pay is designed to look like PayPal or a courier but isn't.",
      },
      {
        question: "Someone asked me for a code to prove I'm 'not a bot' — is that safe?",
        answer:
          "No. That code is usually a verification code for your own account or a new account they're creating in your name. Never share codes sent to your phone with anyone.",
      },
    ],
  },
];

export function getGuide(slug: string): ScamGuide | undefined {
  return SCAM_GUIDES.find((g) => g.slug === slug);
}
