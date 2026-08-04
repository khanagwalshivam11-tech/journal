export interface Quote {
  id: number;
  text: string;
  author: string;
  category: "trading" | "boxing" | "mindset" | "discipline" | "devotional";
}

export const MOTIVATIONAL_QUOTES: Quote[] = [
  {
    id: 1,
    text: "Discipline is doing what you hate to do, but doing it like you love it.",
    author: "Mike Tyson",
    category: "boxing",
  },
  {
    id: 2,
    text: "If you can learn to create a state of mind that is not affected by the market's behavior, the struggle will cease to exist.",
    author: "Mark Douglas (Trading in the Zone)",
    category: "trading",
  },
  {
    id: 3,
    text: "I hated every minute of training, but I said, 'Don't quit. Suffer now and live the rest of your life as a champion.'",
    author: "Muhammad Ali",
    category: "boxing",
  },
  {
    id: 4,
    text: "Don't focus on making money; focus on protecting what you have and execution of your edge.",
    author: "Paul Tudor Jones",
    category: "trading",
  },
  {
    id: 5,
    text: "Pain plus reflection equals progress.",
    author: "Ray Dalio",
    category: "mindset",
  },
  {
    id: 6,
    text: "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.",
    author: "Bruce Lee",
    category: "boxing",
  },
  {
    id: 7,
    text: "The hard work puts you where good luck can find you.",
    author: "Kobe Bryant",
    category: "discipline",
  },
  {
    id: 8,
    text: "The market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett",
    category: "trading",
  },
  {
    id: 9,
    text: "Losses are part of the game. How you react to a loss defines whether you stay in the ring.",
    author: "Cus D'Amato",
    category: "boxing",
  },
  {
    id: 10,
    text: "You are in danger of living a life so comfortable that you will die without ever realizing your true potential.",
    author: "David Goggins",
    category: "discipline",
  },
  {
    id: 11,
    text: "In trading, you have to be defensive. Always manage risk first and let profits take care of themselves.",
    author: "Paul Tudor Jones",
    category: "trading",
  },
  {
    id: 12,
    text: "At dawn, when you have trouble getting out of bed, tell yourself: 'I have to go to work — as a human being.'",
    author: "Marcus Aurelius",
    category: "mindset",
  },
  {
    id: 13,
    text: "To be a great champion, you must believe you are the best. If you're not, pretend you are.",
    author: "Muhammad Ali",
    category: "boxing",
  },
  {
    id: 14,
    text: "It's not whether you're right or wrong that's important, but how much money you make when you're right and how much you lose when you're wrong.",
    author: "George Soros",
    category: "trading",
  },
  {
    id: 15,
    text: "There is nothing outside of yourself that can ever enable you to get better. Everything is within.",
    author: "Miyamoto Musashi",
    category: "mindset",
  },
  {
    id: 16,
    text: "Hard work beats talent when talent doesn't work hard.",
    author: "Tim Notke",
    category: "discipline",
  },
  {
    id: 17,
    text: "The elements of good trading are: 1. Cutting losses, 2. Cutting losses, and 3. Cutting losses. If you can follow these three rules, you may have a chance.",
    author: "Ed Seykota",
    category: "trading",
  },
  {
    id: 18,
    text: "He who is not courageous enough to take risks will accomplish nothing in life.",
    author: "Muhammad Ali",
    category: "boxing",
  },
  {
    id: 19,
    text: "We don't rise to the level of our expectations, we fall to the level of our training.",
    author: "Archilochus",
    category: "discipline",
  },
  {
    id: 20,
    text: "The desire for constant action without regard to underlying conditions is responsible for many losses in Wall Street.",
    author: "Jesse Livermore",
    category: "trading",
  },
  {
    id: 21,
    text: "Heroes and cowards feel the exact same fear. It's what you do with it that makes you a hero.",
    author: "Cus D'Amato",
    category: "boxing",
  },
  {
    id: 22,
    text: "Small daily improvements over time lead to stunning results.",
    author: "Robin Sharma",
    category: "discipline",
  },
  {
    id: 23,
    text: "Amateurs think about how much money they can make. Professionals think about how much money they can lose.",
    author: "Victor Sperandeo",
    category: "trading",
  },
  {
    id: 24,
    text: "Doubt is only removed by action. If you're not working, that's where doubt comes in.",
    author: "Conor McGregor",
    category: "boxing",
  },
  {
    id: 25,
    text: "You don't have to be extreme, just consistent.",
    author: "Mindset Principle",
    category: "mindset",
  },
  {
    id: 26,
    text: "When you feel like stopping, think about why you started.",
    author: "Anonymous Athlete",
    category: "discipline",
  },
  {
    id: 27,
    text: "Win or learn. There is no losing if you review every mistake and correct it tomorrow.",
    author: "Trading & Athletic Rule",
    category: "mindset",
  },
  {
    id: 28,
    text: "The market is a mirror of your self-discipline. Master yourself and you master the charts.",
    author: "Mark Douglas",
    category: "trading",
  },
  {
    id: 29,
    text: "Everyone has a plan until they get punched in the mouth.",
    author: "Mike Tyson",
    category: "boxing",
  },
  {
    id: 30,
    text: "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.",
    author: "Dwayne Johnson",
    category: "discipline",
  },
  {
    id: 31,
    text: "Parth, fal ki chinta mat kar, bas imandari se apna karam kar. Natija mere haath mein hai.",
    author: "Lord Krishna (Bhagavad Gita 2.47)",
    category: "devotional",
  },
  {
    id: 32,
    text: "Jo hua woh accha hua, jo ho raha hai woh accha ho raha hai, jo hoga woh bhi accha hi hoga. Ghabra mat, main tere saath hoon.",
    author: "Shri Krishna (Gita Updesh)",
    category: "devotional",
  },
  {
    id: 33,
    text: "Insaan apne vishwas se banta hai. Jaisa woh sochta hai aur vishwas karta hai, waisa hi woh ban jata hai.",
    author: "Lord Krishna (Bhagavad Gita 17.3)",
    category: "devotional",
  },
  {
    id: 34,
    text: "Mann bahut chanchal hai Parth, par abhyas (practice) aur vairagya (discipline) se isse bas mein kiya ja sakta hai.",
    author: "Lord Krishna (Bhagavad Gita 6.35)",
    category: "devotional",
  },
  {
    id: 35,
    text: "Krodh se bhram paida hota hai, bhram se buddhi ka vinash hota hai. Jab buddhi ka vinash hota hai, tab manushya ka patan hota hai.",
    author: "Shri Krishna (Bhagavad Gita 2.63)",
    category: "devotional",
  },
  {
    id: 36,
    text: "Jeet ho ya haar, profit ho ya loss — har sthiti mein sam-bhav (equanimity) bana kar rakh. Yahi asli sthirta hai.",
    author: "Shri Krishna (Bhagavad Gita 2.48)",
    category: "devotional",
  },
  {
    id: 37,
    text: "Kyun vyarth ki chinta karte ho? Kis se vyarth darte ho? Kaun tumhe maar sakta hai? Aatma na kabhi janm leti hai na marti hai.",
    author: "Lord Krishna (Divine Updesh)",
    category: "devotional",
  },
  {
    id: 38,
    text: "Shanti, namrata, maun aur mann ki pavitrata — ye sab dhyan aur disciplined dimaag ki pehchan hain.",
    author: "Lord Krishna (Bhagavad Gita 17.16)",
    category: "devotional",
  },
  {
    id: 39,
    text: "Parivartan hi is sansar ka niyam hai. Kal jo kisi aur ka tha, aaj tera hai, aur kal kisi aur ka hoga. Apne kartavya par dhyan de.",
    author: "Lord Krishna (Bhagavad Gita)",
    category: "devotional",
  },
  {
    id: 40,
    text: "Aapka sabse bada mitra aapka apna mann hai agar aapne use vash mein kar liya, aur sabse bada shatru bhi wahi hai agar wo behak gaya.",
    author: "Shri Krishna (Bhagavad Gita 6.6)",
    category: "devotional",
  },
  {
    id: 41,
    text: "Kaam, krodh aur laalach — ye teen aatma ke vinash ke dwar hain. Apne jazbaat aur laalach par kabu rakhna hi asli vijay hai.",
    author: "Shri Krishna (Bhagavad Gita 16.21)",
    category: "devotional",
  }
];

// Helper to get daily quote based on current calendar date string YYYY-MM-DD
export function getDailyQuote(customDateStr?: string): Quote {
  const dateKey = customDateStr || new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
}
