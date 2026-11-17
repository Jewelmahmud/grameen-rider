/**
 * Public site copy, structured with the StoryBrand SB7 framework:
 * 1 Character (what they want) · 2 Problem (external / internal / philosophical) · 3 Guide (empathy + authority)
 * · 4 Plan · 5 Call to action (direct + transitional) · 6 Failure avoided · 7 Success.
 *
 * Claims stay within what the product does today (fixed upfront prices, fair-share one-at-a-time matching,
 * driver earnings on the full fare, verified drivers). No invented figures or testimonials.
 */
import { useTranslation } from 'react-i18next';

const en = {
  landing: {
    // 1 Character — the customer and what they want
    heroEyebrow: 'Rides and rentals across Bangladesh',
    heroTitle: 'Know your fare before you go.',
    heroBody:
      'See the full price for every vehicle before you book. No bargaining, no surprises — a nearby driver is matched to you automatically.',
    ctaPrimary: 'Book a ride',
    ctaSecondary: 'See how it works',
    trust: ['Price shown before you book', 'Verified drivers', 'One GiLab account for every Grameen service'],

    // 2 Problem
    problemTitle: 'Getting around shouldn’t be a negotiation',
    problems: [
      { title: 'Fares that change', body: 'Haggling at the roadside, or a price that grows halfway through the trip.' },
      { title: 'Not knowing if it’s fair', body: 'That nagging feeling you paid more than the person before you.' },
      { title: 'Waiting and wondering', body: 'Standing on the street, not sure if anyone is coming at all.' },
    ],
    philosophical: 'Everyone deserves a fair price and a reliable ride — passengers and drivers alike.',

    // 3 Guide — empathy + authority
    guideTitle: 'We built Grameen Ride to take the guesswork out',
    guideEmpathy:
      'We’ve stood on those roadsides too. So we set prices openly by distance and show them to you before you commit.',
    guideAuthority: [
      { title: 'Part of the Grameen ecosystem', body: 'Sign in with the same GiLab account you use for other Grameen services.' },
      { title: 'Prices set in the open', body: 'Per-kilometre rates and fixed route fares are managed by our team, not negotiated on the street.' },
      { title: 'Drivers you can trust', body: 'Every driver and vehicle is checked before they can take trips.' },
    ],

    // 4 Plan
    planTitle: 'Three steps to your destination',
    plan: [
      { title: 'Set your trip', body: 'Choose pickup and destination on the map — or search an address.' },
      { title: 'Pick a price', body: 'See the total for every vehicle type. The price you pick is the price you pay.' },
      { title: 'Ride', body: 'A nearby driver accepts. Follow your trip until you arrive.' },
    ],

    // Services
    servicesTitle: 'Two ways to travel',
    services: [
      {
        key: 'ride',
        title: 'Ride',
        body: 'Right now or later today. Motorcycle, car, CNG, van or rickshaw — whatever fits the trip.',
        points: ['Matched with the nearest available driver', 'Fixed fares on popular routes', 'Schedule ahead when you need to'],
      },
      {
        key: 'rental',
        title: 'Rental',
        body: 'Book a vehicle with a driver for a planned trip — a family visit, an event, a day of errands.',
        points: ['Book ahead and pick your start time', 'Add stops along the way', 'Round trips with a lower return charge'],
      },
    ],

    // 6 Failure / 7 Success
    stakesTitle: 'What changes when the price is clear',
    failureTitle: 'Leave behind',
    failure: ['Bargaining before every trip', 'Paying more than you expected', 'Waiting without knowing'],
    successTitle: 'Get instead',
    success: ['A price you agreed to before you left', 'A driver who accepted your trip, on the way to you', 'Arriving on time, with nothing to argue about'],

    // 5 CTA (final) + transitional
    finalTitle: 'Your next trip, at a price you already know',
    finalBody: 'Create your account in a minute with your phone number.',
    finalCta: 'Sign up free',
    haveAccount: 'Already have an account? Log in',
    driverTitle: 'Drive with Grameen Ride',
    driverBody: 'Fair work, shared evenly. Earn on the full fare.',
    driverCta: 'Learn about driving',
    employeeTitle: 'Work at GiLab?',
    employeeBody: 'Sign in with your GiLab account to see your employee benefits on every trip.',
  },

  drive: {
    eyebrow: 'For drivers',
    title: 'Steady work. A fair share of every day’s trips.',
    body: 'Grameen Ride offers trips one driver at a time and favours drivers who have had fewer trips today — so work is spread fairly, not won by whoever taps fastest.',
    cta: 'Sign up to drive',
    ctaSecondary: 'How it works',
    problemTitle: 'Driving shouldn’t mean fighting for every trip',
    problems: [
      { title: 'The fastest tap wins', body: 'On many apps a trip goes to everyone at once, and the same few drivers get most of the work.' },
      { title: 'Arguing over fares', body: 'Bargaining with every passenger costs time and goodwill.' },
      { title: 'Uncertain earnings', body: 'Hard to plan your day when you never know if work will come.' },
    ],
    guideTitle: 'Matching that is fair by design',
    guide: [
      { title: 'One offer at a time', body: 'Each trip is offered to one driver, with time to decide. No racing other drivers.' },
      { title: 'Fewer trips today, higher in line', body: 'Distance matters most, but drivers who have had less work today move up.' },
      { title: 'Fixed fares, no bargaining', body: 'Passengers agree to the price before booking, so there is nothing to negotiate.' },
      { title: 'Earn on the full fare', body: 'When a passenger gets a discount, the platform pays for it — your earning is based on the full fare.' },
    ],
    planTitle: 'Start driving in three steps',
    plan: [
      { title: 'Create your account', body: 'Sign up with your phone number and verify it.' },
      { title: 'Add your licence and vehicle', body: 'In the driver app. Our team checks them before you go online.' },
      { title: 'Go online and accept trips', body: 'Offers come to you one at a time. Accept the ones that suit you.' },
    ],
    successTitle: 'A working day you can plan around',
    success: ['Work shared evenly between drivers', 'No time lost bargaining', 'Earnings you can see after every trip'],
    finalTitle: 'Ready to drive with us?',
    finalCta: 'Sign up as a driver',
  },

  help: {
    title: 'How can we help?',
    body: 'Answers to common questions. Can’t find yours? Contact us and we’ll get back to you.',
    contactTitle: 'Still need help?',
    contactBody: 'Log in to open a support request and follow its progress, or call us.',
    openTicket: 'Open a support request',
    call: 'Call support',
    whatsapp: 'WhatsApp',
    faqs: [
      { q: 'How is my fare calculated?', a: 'By distance, using per-kilometre rates set for each vehicle type. Some popular routes have a fixed fare. You see the total before you book, and that is what you pay.' },
      { q: 'Can the price change during the trip?', a: 'No. The price is fixed when you book. If your quote expires before you confirm, simply check the price again.' },
      { q: 'How is a driver chosen for me?', a: 'Your trip is offered to nearby drivers one at a time. Closeness matters most, and drivers who have had fewer trips today are given a fair chance.' },
      { q: 'What is a rental?', a: 'A vehicle with a driver booked ahead for a planned trip. You choose the start time, can add stops, and round trips charge less for the return leg.' },
      { q: 'How do I pay?', a: 'Choose a payment method when you book. Cash is always available; other methods appear when they are enabled.' },
      { q: 'Can I cancel?', a: 'Yes, until the trip starts. Open the trip and choose Cancel trip.' },
      { q: 'I work at GiLab. Do I get anything extra?', a: 'Yes. Sign in with your GiLab account and your employee benefits — such as a discount — are applied automatically when they are active.' },
      { q: 'I forgot my password.', a: 'Log in with a one-time code sent to your phone instead. Your password itself is managed by your GiLab account.' },
    ],
  },

  forgot: {
    title: 'Forgot your password?',
    body: 'No problem. Log in with a one-time code sent to your phone instead.',
    note: 'Your password belongs to your GiLab account, which you use across Grameen services.',
    manage: 'Manage your GiLab account',
    back: 'Back to log in',
  },

  notFound: {
    title: 'We couldn’t find that page',
    body: 'The link may be old or mistyped. Let’s get you back on the road.',
    home: 'Go to the home page',
    book: 'Book a ride',
  },

  driverHome: {
    title: 'Welcome, driver',
    body: 'You take trips in the Grameen Ride driver app. Here is where your account stands.',
    statusTitle: 'Your status',
    notRegistered: 'You haven’t finished driver registration yet. Open the driver app to add your licence and vehicle.',
    pending: 'Your documents are being checked. We’ll let you know when you can go online.',
    approved: 'You’re approved. Open the driver app and go online to start receiving trips.',
    rejected: 'Your application was not approved. Contact support to find out more.',
    suspended: 'Your account is paused. Contact support.',
    getApp: 'Get the driver app',
    appSoon: 'Ask our support team for the driver app download link.',
    bookToo: 'You can also book rides for yourself',
  },

  legal: {
    draft: 'Draft — this text is a placeholder and must be reviewed and approved by Grameen Innovation Lab before launch.',
    updated: 'Last updated',
  },

  footer: {
    tagline: 'Fair rides and rentals, priced before you go.',
    company: 'A Grameen Innovation Lab service',
    links: { book: 'Book a ride', drive: 'Drive with us', help: 'Help', terms: 'Terms', privacy: 'Privacy' },
  },

  nav: { ride: 'Ride', rental: 'Rental', drive: 'Drive', help: 'Help', login: 'Log in', signup: 'Sign up', openApp: 'Open app' },
};

export type SiteCopy = typeof en;

const bn: SiteCopy = {
  landing: {
    heroEyebrow: 'সারা বাংলাদেশে রাইড ও ভাড়া',
    heroTitle: 'যাওয়ার আগেই ভাড়া জানুন।',
    heroBody:
      'বুক করার আগেই প্রতিটি যানবাহনের পুরো ভাড়া দেখুন। কোনো দরদাম নেই, কোনো চমক নেই — কাছের একজন চালক নিজে থেকেই আপনার সাথে যুক্ত হবেন।',
    ctaPrimary: 'রাইড বুক করুন',
    ctaSecondary: 'কীভাবে কাজ করে দেখুন',
    trust: ['বুক করার আগেই ভাড়া দেখানো হয়', 'যাচাই করা চালক', 'সব গ্রামীণ সেবার জন্য একটি GiLab অ্যাকাউন্ট'],

    problemTitle: 'যাতায়াত মানেই দরকষাকষি হওয়া উচিত নয়',
    problems: [
      { title: 'ভাড়া বদলে যায়', body: 'রাস্তায় দাঁড়িয়ে দরদাম, কিংবা পথের মাঝে ভাড়া বেড়ে যাওয়া।' },
      { title: 'ন্যায্য কিনা বোঝা যায় না', body: 'মনে হয়, আগের যাত্রীর চেয়ে বেশি দিয়ে ফেললাম না তো?' },
      { title: 'অপেক্ষা আর অনিশ্চয়তা', body: 'রাস্তায় দাঁড়িয়ে থাকা, কেউ আসছে কিনা তাও জানা নেই।' },
    ],
    philosophical: 'ন্যায্য ভাড়া আর নির্ভরযোগ্য যাত্রা সবার প্রাপ্য — যাত্রী ও চালক দুজনেরই।',

    guideTitle: 'অনিশ্চয়তা দূর করতেই আমরা গ্রামীণ রাইড বানিয়েছি',
    guideEmpathy:
      'আমরাও ওই রাস্তায় দাঁড়িয়েছি। তাই দূরত্ব অনুযায়ী খোলাখুলি ভাড়া ঠিক করি, আর বুক করার আগেই আপনাকে দেখাই।',
    guideAuthority: [
      { title: 'গ্রামীণ পরিবারের অংশ', body: 'অন্যান্য গ্রামীণ সেবার একই GiLab অ্যাকাউন্ট দিয়ে লগ ইন করুন।' },
      { title: 'খোলাখুলি ভাড়া', body: 'কিলোমিটারপ্রতি রেট ও নির্দিষ্ট রুট ভাড়া আমাদের দল ঠিক করে, রাস্তায় দরদামে নয়।' },
      { title: 'ভরসার চালক', body: 'ট্রিপ নেওয়ার আগে প্রতিটি চালক ও যানবাহন যাচাই করা হয়।' },
    ],

    planTitle: 'গন্তব্যে পৌঁছাতে তিনটি ধাপ',
    plan: [
      { title: 'যাত্রা ঠিক করুন', body: 'মানচিত্রে যেখান থেকে ও গন্তব্য বেছে নিন — অথবা ঠিকানা খুঁজুন।' },
      { title: 'ভাড়া বেছে নিন', body: 'প্রতিটি যানবাহনের মোট ভাড়া দেখুন। যে ভাড়া বাছবেন, সেটাই দেবেন।' },
      { title: 'রওনা দিন', body: 'কাছের একজন চালক গ্রহণ করবেন। পৌঁছানো পর্যন্ত যাত্রা দেখতে থাকুন।' },
    ],

    servicesTitle: 'যাতায়াতের দুটি উপায়',
    services: [
      {
        key: 'ride',
        title: 'রাইড',
        body: 'এখনই বা আজ পরে। মোটরসাইকেল, কার, সিএনজি, ভ্যান বা রিকশা — যেটা যাত্রার সাথে মানায়।',
        points: ['কাছের খালি চালকের সাথে যুক্ত হন', 'জনপ্রিয় রুটে নির্দিষ্ট ভাড়া', 'দরকার হলে আগে থেকে সময় ঠিক করুন'],
      },
      {
        key: 'rental',
        title: 'ভাড়া',
        body: 'পরিকল্পিত যাত্রার জন্য চালকসহ গাড়ি বুক করুন — পরিবারের কাছে যাওয়া, অনুষ্ঠান, বা সারাদিনের কাজ।',
        points: ['আগে থেকে বুক করে শুরুর সময় ঠিক করুন', 'পথে থামার জায়গা যোগ করুন', 'যাওয়া-আসায় ফেরার পথে কম ভাড়া'],
      },
    ],

    stakesTitle: 'ভাড়া পরিষ্কার হলে যা বদলায়',
    failureTitle: 'যা পেছনে ফেলবেন',
    failure: ['প্রতিবার যাওয়ার আগে দরদাম', 'যা ভেবেছিলেন তার চেয়ে বেশি ভাড়া', 'না জেনে অপেক্ষা'],
    successTitle: 'যা পাবেন',
    success: ['রওনার আগেই মেনে নেওয়া ভাড়া', 'আপনার ট্রিপ গ্রহণ করে আসছেন এমন চালক', 'সময়মতো পৌঁছানো, কোনো তর্ক ছাড়াই'],

    finalTitle: 'পরের যাত্রা, আগে থেকে জানা ভাড়ায়',
    finalBody: 'ফোন নম্বর দিয়ে এক মিনিটে অ্যাকাউন্ট খুলুন।',
    finalCta: 'বিনামূল্যে সাইন আপ',
    haveAccount: 'আগেই অ্যাকাউন্ট আছে? লগ ইন করুন',
    driverTitle: 'গ্রামীণ রাইডে গাড়ি চালান',
    driverBody: 'ন্যায্য কাজ, সমানভাবে ভাগ করা। পুরো ভাড়ার উপর আয়।',
    driverCta: 'চালক হওয়া সম্পর্কে জানুন',
    employeeTitle: 'GiLab-এ কাজ করেন?',
    employeeBody: 'আপনার GiLab অ্যাকাউন্ট দিয়ে লগ ইন করুন, প্রতিটি ট্রিপে কর্মী সুবিধা দেখতে পাবেন।',
  },

  drive: {
    eyebrow: 'চালকদের জন্য',
    title: 'নিয়মিত কাজ। প্রতিদিনের ট্রিপের ন্যায্য ভাগ।',
    body: 'গ্রামীণ রাইড একবারে একজন চালককে ট্রিপ দেয়, আর আজ যারা কম ট্রিপ পেয়েছেন তাদের অগ্রাধিকার দেয় — তাই কাজ সবার মধ্যে ন্যায্যভাবে ভাগ হয়, দ্রুত চাপ দেওয়ার প্রতিযোগিতায় নয়।',
    cta: 'চালক হিসেবে সাইন আপ',
    ctaSecondary: 'কীভাবে কাজ করে',
    problemTitle: 'গাড়ি চালানো মানে প্রতিটি ট্রিপের জন্য লড়াই হওয়া উচিত নয়',
    problems: [
      { title: 'যে আগে চাপে সে পায়', body: 'অনেক অ্যাপে একটি ট্রিপ সবার কাছে একসাথে যায়, আর বেশিরভাগ কাজ পান অল্প কয়েকজন।' },
      { title: 'ভাড়া নিয়ে তর্ক', body: 'প্রতিটি যাত্রীর সাথে দরদামে সময় ও সম্পর্ক দুটোই নষ্ট হয়।' },
      { title: 'অনিশ্চিত আয়', body: 'কাজ আসবে কিনা না জানলে দিনের পরিকল্পনা করা কঠিন।' },
    ],
    guideTitle: 'নকশাতেই ন্যায্য ম্যাচিং',
    guide: [
      { title: 'একবারে একটি অফার', body: 'প্রতিটি ট্রিপ একজন চালককে দেওয়া হয়, ভাবার সময়সহ। অন্য চালকের সাথে দৌড় নেই।' },
      { title: 'আজ কম ট্রিপ, লাইনে আগে', body: 'দূরত্ব সবচেয়ে গুরুত্বপূর্ণ, তবে আজ যাদের কাজ কম হয়েছে তারা এগিয়ে যান।' },
      { title: 'নির্দিষ্ট ভাড়া, দরদাম নেই', body: 'যাত্রী বুক করার আগেই ভাড়া মেনে নেন, তাই দরকষাকষির কিছু নেই।' },
      { title: 'পুরো ভাড়ার উপর আয়', body: 'যাত্রী ছাড় পেলে সেটা প্ল্যাটফর্ম দেয় — আপনার আয় হিসাব হয় পুরো ভাড়ার উপর।' },
    ],
    planTitle: 'তিন ধাপে গাড়ি চালানো শুরু করুন',
    plan: [
      { title: 'অ্যাকাউন্ট খুলুন', body: 'ফোন নম্বর দিয়ে সাইন আপ করে যাচাই করুন।' },
      { title: 'লাইসেন্স ও যানবাহন যোগ করুন', body: 'চালক অ্যাপে। অনলাইনে যাওয়ার আগে আমাদের দল যাচাই করবে।' },
      { title: 'অনলাইনে যান, ট্রিপ নিন', body: 'অফার একটি একটি করে আসবে। যেগুলো সুবিধা হয়, গ্রহণ করুন।' },
    ],
    successTitle: 'এমন কর্মদিবস যার পরিকল্পনা করা যায়',
    success: ['চালকদের মধ্যে সমানভাবে ভাগ করা কাজ', 'দরদামে সময় নষ্ট নেই', 'প্রতিটি ট্রিপের পর আয় দেখা যায়'],
    finalTitle: 'আমাদের সাথে গাড়ি চালাতে প্রস্তুত?',
    finalCta: 'চালক হিসেবে সাইন আপ',
  },

  help: {
    title: 'কীভাবে সাহায্য করতে পারি?',
    body: 'সাধারণ প্রশ্নের উত্তর। আপনার প্রশ্ন না পেলে যোগাযোগ করুন, আমরা উত্তর দেব।',
    contactTitle: 'আরও সাহায্য দরকার?',
    contactBody: 'লগ ইন করে সহায়তার অনুরোধ খুলুন ও অগ্রগতি দেখুন, অথবা আমাদের ফোন করুন।',
    openTicket: 'সহায়তার অনুরোধ খুলুন',
    call: 'সহায়তায় ফোন',
    whatsapp: 'হোয়াটসঅ্যাপ',
    faqs: [
      { q: 'ভাড়া কীভাবে হিসাব হয়?', a: 'দূরত্ব অনুযায়ী, প্রতিটি যানবাহনের কিলোমিটারপ্রতি রেটে। কিছু জনপ্রিয় রুটে নির্দিষ্ট ভাড়া আছে। বুক করার আগেই মোট ভাড়া দেখবেন, সেটাই দেবেন।' },
      { q: 'যাত্রার মাঝে কি ভাড়া বদলাতে পারে?', a: 'না। বুক করার সময় ভাড়া নির্দিষ্ট হয়ে যায়। নিশ্চিত করার আগে মেয়াদ শেষ হলে আবার ভাড়া দেখুন।' },
      { q: 'আমার জন্য চালক কীভাবে বাছা হয়?', a: 'আপনার ট্রিপ কাছের চালকদের একজন একজন করে দেওয়া হয়। কাছে থাকা সবচেয়ে গুরুত্বপূর্ণ, আর আজ কম ট্রিপ পাওয়া চালকেরাও ন্যায্য সুযোগ পান।' },
      { q: 'ভাড়া (রেন্টাল) কী?', a: 'পরিকল্পিত যাত্রার জন্য আগে থেকে চালকসহ গাড়ি বুক করা। শুরুর সময় বাছবেন, থামার জায়গা যোগ করতে পারবেন, আর যাওয়া-আসায় ফেরার পথে কম ভাড়া।' },
      { q: 'কীভাবে পেমেন্ট করব?', a: 'বুক করার সময় পেমেন্টের উপায় বেছে নিন। নগদ সবসময় আছে; অন্য উপায় চালু হলে দেখা যাবে।' },
      { q: 'বাতিল করা যায়?', a: 'হ্যাঁ, যাত্রা শুরু হওয়া পর্যন্ত। ট্রিপ খুলে "ট্রিপ বাতিল" বেছে নিন।' },
      { q: 'আমি GiLab-এ কাজ করি। বাড়তি কিছু পাব?', a: 'হ্যাঁ। GiLab অ্যাকাউন্ট দিয়ে লগ ইন করুন, কর্মী সুবিধা (যেমন ছাড়) চালু থাকলে নিজে থেকেই যুক্ত হবে।' },
      { q: 'পাসওয়ার্ড ভুলে গেছি।', a: 'ফোনে পাঠানো ওয়ান-টাইম কোড দিয়ে লগ ইন করুন। পাসওয়ার্ড আপনার GiLab অ্যাকাউন্টের অংশ।' },
    ],
  },

  forgot: {
    title: 'পাসওয়ার্ড ভুলে গেছেন?',
    body: 'সমস্যা নেই। ফোনে পাঠানো ওয়ান-টাইম কোড দিয়ে লগ ইন করুন।',
    note: 'আপনার পাসওয়ার্ড GiLab অ্যাকাউন্টের অংশ, যা আপনি সব গ্রামীণ সেবায় ব্যবহার করেন।',
    manage: 'GiLab অ্যাকাউন্ট পরিচালনা',
    back: 'লগ ইনে ফিরে যান',
  },

  notFound: {
    title: 'পাতাটি খুঁজে পাওয়া যায়নি',
    body: 'লিংকটি পুরোনো বা ভুল হতে পারে। চলুন আবার পথে ফিরি।',
    home: 'হোম পাতায় যান',
    book: 'রাইড বুক করুন',
  },

  driverHome: {
    title: 'স্বাগতম, চালক',
    body: 'ট্রিপ নেওয়া হয় গ্রামীণ রাইড চালক অ্যাপে। আপনার অ্যাকাউন্টের অবস্থা এখানে দেখুন।',
    statusTitle: 'আপনার অবস্থা',
    notRegistered: 'চালক নিবন্ধন এখনো শেষ হয়নি। লাইসেন্স ও যানবাহন যোগ করতে চালক অ্যাপ খুলুন।',
    pending: 'আপনার কাগজপত্র যাচাই করা হচ্ছে। অনলাইনে যেতে পারলে আমরা জানাব।',
    approved: 'আপনি অনুমোদিত। ট্রিপ পেতে চালক অ্যাপ খুলে অনলাইনে যান।',
    rejected: 'আপনার আবেদন অনুমোদিত হয়নি। বিস্তারিত জানতে সহায়তায় যোগাযোগ করুন।',
    suspended: 'আপনার অ্যাকাউন্ট সাময়িক বন্ধ। সহায়তায় যোগাযোগ করুন।',
    getApp: 'চালক অ্যাপ নিন',
    appSoon: 'চালক অ্যাপের ডাউনলোড লিংকের জন্য আমাদের সহায়তা দলকে জিজ্ঞেস করুন।',
    bookToo: 'নিজের জন্যও রাইড বুক করতে পারেন',
  },

  legal: {
    draft: 'খসড়া — এই লেখাটি নমুনা মাত্র; চালুর আগে গ্রামীণ ইনোভেশন ল্যাবকে পর্যালোচনা ও অনুমোদন করতে হবে।',
    updated: 'সর্বশেষ হালনাগাদ',
  },

  footer: {
    tagline: 'ন্যায্য রাইড ও ভাড়া, যাওয়ার আগেই জানা দামে।',
    company: 'গ্রামীণ ইনোভেশন ল্যাবের একটি সেবা',
    links: { book: 'রাইড বুক করুন', drive: 'চালক হোন', help: 'সাহায্য', terms: 'শর্তাবলি', privacy: 'গোপনীয়তা' },
  },

  nav: { ride: 'রাইড', rental: 'ভাড়া', drive: 'চালক হোন', help: 'সাহায্য', login: 'লগ ইন', signup: 'সাইন আপ', openApp: 'অ্যাপে যান' },
};

export function useSiteCopy(): SiteCopy {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? en : bn;
}
