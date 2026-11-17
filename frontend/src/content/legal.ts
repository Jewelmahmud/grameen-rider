/**
 * DRAFT legal text. It describes how the service works today and must be reviewed, completed and approved
 * by Grameen Innovation Lab's legal team before launch. The pages show a "Draft" banner until then.
 */
import { useTranslation } from 'react-i18next';

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}

const termsEn: LegalDoc = {
  title: 'Terms of Service',
  updated: '17 November 2026',
  intro: 'These terms apply when you use Grameen Ride to book rides and rentals, or to drive. By creating an account or booking a trip you agree to them.',
  sections: [
    { heading: '1. The service', body: ['Grameen Ride connects passengers with independent drivers for rides and rentals. Grameen Ride is a service of Grameen Innovation Lab (GiLab).'] },
    { heading: '2. Your account', body: ['You sign in with a GiLab account. Keep your password and one-time codes private; you are responsible for activity on your account.', 'Your phone number must be verified before you can book or drive.'] },
    { heading: '3. Prices and payment', body: ['The price shown when you confirm a booking is the price of the trip. Quotes are valid for a limited time; after that you need to check the price again.', 'Discounts, including promotions and employee benefits, are applied as shown at booking. Only one discount applies to a trip.', 'You pay using the method you chose when booking.'] },
    { heading: '4. Rentals', body: ['Rentals are booked ahead for a start time you choose. A driver is matched before the start time. If no driver can be found, we will contact you.'] },
    { heading: '5. Cancellations', body: ['You can cancel a trip until it starts. [Cancellation fees, if any, to be confirmed.]'] },
    { heading: '6. Conduct', body: ['Treat drivers, passengers and our staff with respect. We may suspend or block accounts involved in fraud, abuse or unsafe behaviour.'] },
    { heading: '7. Drivers', body: ['Drivers must hold a valid licence and use a vehicle approved by Grameen Ride. Trips are offered one driver at a time; drivers may accept or decline.'] },
    { heading: '8. Liability', body: ['[Limitation of liability, insurance and dispute resolution to be written by the legal team.]'] },
    { heading: '9. Changes', body: ['We may update these terms. We will tell you about important changes before they take effect.'] },
    { heading: '10. Contact', body: ['Questions about these terms: contact Grameen Ride support from the Help page.'] },
  ],
};

const termsBn: LegalDoc = {
  title: 'সেবার শর্তাবলি',
  updated: '১৭ নভেম্বর ২০২৬',
  intro: 'রাইড ও ভাড়া বুক করতে বা গাড়ি চালাতে গ্রামীণ রাইড ব্যবহার করলে এই শর্তাবলি প্রযোজ্য। অ্যাকাউন্ট খুললে বা ট্রিপ বুক করলে আপনি এগুলোতে সম্মত হচ্ছেন।',
  sections: [
    { heading: '১. সেবা', body: ['গ্রামীণ রাইড রাইড ও ভাড়ার জন্য যাত্রীদের স্বাধীন চালকদের সাথে যুক্ত করে। গ্রামীণ রাইড গ্রামীণ ইনোভেশন ল্যাবের (GiLab) একটি সেবা।'] },
    { heading: '২. আপনার অ্যাকাউন্ট', body: ['আপনি GiLab অ্যাকাউন্ট দিয়ে লগ ইন করেন। পাসওয়ার্ড ও ওয়ান-টাইম কোড গোপন রাখুন; আপনার অ্যাকাউন্টের কার্যক্রমের দায় আপনার।', 'বুক করা বা গাড়ি চালানোর আগে ফোন নম্বর যাচাই করতে হবে।'] },
    { heading: '৩. ভাড়া ও পেমেন্ট', body: ['বুকিং নিশ্চিত করার সময় দেখানো ভাড়াই ট্রিপের ভাড়া। ভাড়ার প্রস্তাব নির্দিষ্ট সময় পর্যন্ত বৈধ; এরপর আবার ভাড়া দেখতে হবে।', 'প্রোমোশন ও কর্মী সুবিধাসহ ছাড় বুকিংয়ের সময় যেমন দেখানো হয় তেমন প্রযোজ্য। একটি ট্রিপে একটিই ছাড় প্রযোজ্য।', 'বুকিংয়ের সময় বেছে নেওয়া উপায়ে পেমেন্ট করবেন।'] },
    { heading: '৪. ভাড়া (রেন্টাল)', body: ['রেন্টাল আপনার বাছাই করা শুরুর সময়ের জন্য আগে থেকে বুক হয়। শুরুর আগে চালক নির্ধারণ হয়। চালক না পাওয়া গেলে আমরা আপনার সাথে যোগাযোগ করব।'] },
    { heading: '৫. বাতিল', body: ['যাত্রা শুরু হওয়া পর্যন্ত ট্রিপ বাতিল করতে পারবেন। [বাতিল ফি থাকলে তা নিশ্চিত করা হবে।]'] },
    { heading: '৬. আচরণ', body: ['চালক, যাত্রী ও আমাদের কর্মীদের সাথে সম্মানজনক আচরণ করুন। প্রতারণা, অপব্যবহার বা অনিরাপদ আচরণে জড়িত অ্যাকাউন্ট আমরা স্থগিত বা বন্ধ করতে পারি।'] },
    { heading: '৭. চালক', body: ['চালকদের বৈধ লাইসেন্স থাকতে হবে ও গ্রামীণ রাইড অনুমোদিত যানবাহন ব্যবহার করতে হবে। ট্রিপ একবারে একজন চালককে দেওয়া হয়; চালক গ্রহণ বা প্রত্যাখ্যান করতে পারেন।'] },
    { heading: '৮. দায়', body: ['[দায়ের সীমা, বিমা ও বিরোধ নিষ্পত্তি আইনি দল লিখবে।]'] },
    { heading: '৯. পরিবর্তন', body: ['আমরা এই শর্তাবলি হালনাগাদ করতে পারি। গুরুত্বপূর্ণ পরিবর্তন কার্যকর হওয়ার আগে জানাব।'] },
    { heading: '১০. যোগাযোগ', body: ['এই শর্তাবলি নিয়ে প্রশ্ন থাকলে সাহায্য পাতা থেকে গ্রামীণ রাইড সহায়তায় যোগাযোগ করুন।'] },
  ],
};

const privacyEn: LegalDoc = {
  title: 'Privacy Policy',
  updated: '17 November 2026',
  intro: 'This policy explains what information Grameen Ride uses, why, and the choices you have.',
  sections: [
    { heading: '1. Information we use', body: ['Account details from your GiLab account: name, phone number, email (if given), and — for GiLab staff — your employee status and designation.', 'Trip details: pickup, stops and destination, times, vehicle, price, payment method and ratings.', 'Location: your device location only when you choose “Use my location”. Drivers share their location while online so trips can be matched.', 'Support requests and messages you send us.'] },
    { heading: '2. Why we use it', body: ['To show prices, match you with a driver, run your trip, take payment, give support, prevent fraud and improve the service.', 'GiLab employee status is used only to apply employee benefits and to show your designation where you have chosen to.'] },
    { heading: '3. Who sees it', body: ['Your driver sees your name, pickup and destination for the trip. You see your driver’s name, phone number and vehicle.', 'Our operations staff can see trip and account details to give support. Every change they make is recorded in an audit log.', 'Addresses you search are sent to a map search service to find the location.'] },
    { heading: '4. How long we keep it', body: ['[Retention periods to be set by the legal team.]'] },
    { heading: '5. Your choices', body: ['You can ask us for a copy of your data, to correct it, or to close your account, by contacting support. Your GiLab account itself is managed by GiLab.'] },
    { heading: '6. Security', body: ['We sign you in through GiLab, keep sessions short-lived, and limit staff access by role.'] },
    { heading: '7. Contact', body: ['Privacy questions: contact Grameen Ride support from the Help page.'] },
  ],
};

const privacyBn: LegalDoc = {
  title: 'গোপনীয়তা নীতি',
  updated: '১৭ নভেম্বর ২০২৬',
  intro: 'গ্রামীণ রাইড কোন তথ্য ব্যবহার করে, কেন করে, আর আপনার কী করার আছে — এই নীতিতে তা ব্যাখ্যা করা হয়েছে।',
  sections: [
    { heading: '১. যে তথ্য আমরা ব্যবহার করি', body: ['আপনার GiLab অ্যাকাউন্টের তথ্য: নাম, ফোন নম্বর, ইমেইল (দিলে), এবং GiLab কর্মীদের ক্ষেত্রে কর্মী পরিচয় ও পদবি।', 'ট্রিপের তথ্য: যেখান থেকে, থামার জায়গা ও গন্তব্য, সময়, যানবাহন, ভাড়া, পেমেন্টের উপায় ও রেটিং।', 'অবস্থান: শুধু আপনি “আমার অবস্থান” বাছলে আপনার ডিভাইসের অবস্থান। চালকেরা অনলাইনে থাকার সময় অবস্থান শেয়ার করেন যাতে ট্রিপ মেলানো যায়।', 'আপনার পাঠানো সহায়তার অনুরোধ ও বার্তা।'] },
    { heading: '২. কেন ব্যবহার করি', body: ['ভাড়া দেখাতে, চালকের সাথে যুক্ত করতে, যাত্রা পরিচালনা, পেমেন্ট, সহায়তা, প্রতারণা রোধ ও সেবা উন্নত করতে।', 'GiLab কর্মী পরিচয় শুধু কর্মী সুবিধা দিতে ও পদবি দেখাতে ব্যবহার হয়।'] },
    { heading: '৩. কে দেখতে পায়', body: ['ট্রিপের জন্য আপনার চালক আপনার নাম, যেখান থেকে ও গন্তব্য দেখেন। আপনি চালকের নাম, ফোন নম্বর ও যানবাহন দেখেন।', 'সহায়তার জন্য আমাদের অপারেশনস কর্মীরা ট্রিপ ও অ্যাকাউন্টের তথ্য দেখতে পারেন। তাদের প্রতিটি পরিবর্তন অডিট লগে লেখা থাকে।', 'আপনার খোঁজা ঠিকানা অবস্থান বের করতে একটি মানচিত্র অনুসন্ধান সেবায় পাঠানো হয়।'] },
    { heading: '৪. কতদিন রাখি', body: ['[সংরক্ষণের সময়সীমা আইনি দল ঠিক করবে।]'] },
    { heading: '৫. আপনার পছন্দ', body: ['সহায়তায় যোগাযোগ করে আপনার তথ্যের কপি চাইতে, সংশোধন করতে বা অ্যাকাউন্ট বন্ধ করতে পারেন। GiLab অ্যাকাউন্ট নিজে GiLab পরিচালনা করে।'] },
    { heading: '৬. নিরাপত্তা', body: ['আমরা GiLab-এর মাধ্যমে লগ ইন করাই, সেশন স্বল্পমেয়াদি রাখি, আর ভূমিকা অনুযায়ী কর্মীদের প্রবেশাধিকার সীমিত রাখি।'] },
    { heading: '৭. যোগাযোগ', body: ['গোপনীয়তা নিয়ে প্রশ্ন: সাহায্য পাতা থেকে গ্রামীণ রাইড সহায়তায় যোগাযোগ করুন।'] },
  ],
};

export function useLegal(doc: 'terms' | 'privacy'): LegalDoc {
  const { i18n } = useTranslation();
  const bn = i18n.language !== 'en';
  return doc === 'terms' ? (bn ? termsBn : termsEn) : bn ? privacyBn : privacyEn;
}
