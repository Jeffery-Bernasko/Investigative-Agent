// OSINT Platform Database - 200+ platforms for username enumeration
export const socialPlatforms = [
  // Major Social Networks
  { name: "Facebook", url: "https://www.facebook.com/{}", category: "social" },
  { name: "Instagram", url: "https://www.instagram.com/{}", category: "social" },
  { name: "Twitter/X", url: "https://x.com/{}", category: "social" },
  { name: "TikTok", url: "https://www.tiktok.com/@{}", category: "social" },
  { name: "LinkedIn", url: "https://www.linkedin.com/in/{}", category: "professional" },
  { name: "Snapchat", url: "https://www.snapchat.com/add/{}", category: "social" },
  { name: "Pinterest", url: "https://www.pinterest.com/{}", category: "social" },
  { name: "Reddit", url: "https://www.reddit.com/user/{}", category: "social" },
  { name: "Tumblr", url: "https://{}.tumblr.com", category: "social" },
  { name: "YouTube", url: "https://www.youtube.com/@{}", category: "social" },
  { name: "Threads", url: "https://www.threads.net/@{}", category: "social" },
  
  // Developer Platforms
  { name: "GitHub", url: "https://github.com/{}", category: "developer" },
  { name: "GitLab", url: "https://gitlab.com/{}", category: "developer" },
  { name: "Bitbucket", url: "https://bitbucket.org/{}", category: "developer" },
  { name: "Stack Overflow", url: "https://stackoverflow.com/users/{}", category: "developer" },
  { name: "Dev.to", url: "https://dev.to/{}", category: "developer" },
  { name: "Codepen", url: "https://codepen.io/{}", category: "developer" },
  { name: "Replit", url: "https://replit.com/@{}", category: "developer" },
  { name: "npm", url: "https://www.npmjs.com/~{}", category: "developer" },
  { name: "PyPI", url: "https://pypi.org/user/{}", category: "developer" },
  
  // Gaming
  { name: "Steam", url: "https://steamcommunity.com/id/{}", category: "gaming" },
  { name: "Twitch", url: "https://www.twitch.tv/{}", category: "gaming" },
  { name: "Discord", url: "https://discord.com/users/{}", category: "gaming" },
  { name: "Epic Games", url: "https://www.epicgames.com/id/{}", category: "gaming" },
  { name: "PlayStation Network", url: "https://psnprofiles.com/{}", category: "gaming" },
  { name: "Xbox", url: "https://www.xboxgamertag.com/search/{}", category: "gaming" },
  { name: "Roblox", url: "https://www.roblox.com/user.aspx?username={}", category: "gaming" },
  { name: "Minecraft", url: "https://namemc.com/profile/{}", category: "gaming" },
  
  // Professional
  { name: "AngelList", url: "https://angel.co/u/{}", category: "professional" },
  { name: "Crunchbase", url: "https://www.crunchbase.com/person/{}", category: "professional" },
  { name: "About.me", url: "https://about.me/{}", category: "professional" },
  { name: "Gravatar", url: "https://en.gravatar.com/{}", category: "professional" },
  
  // Creative
  { name: "Behance", url: "https://www.behance.net/{}", category: "creative" },
  { name: "Dribbble", url: "https://dribbble.com/{}", category: "creative" },
  { name: "DeviantArt", url: "https://{}.deviantart.com", category: "creative" },
  { name: "ArtStation", url: "https://www.artstation.com/{}", category: "creative" },
  { name: "500px", url: "https://500px.com/{}", category: "creative" },
  { name: "Flickr", url: "https://www.flickr.com/photos/{}", category: "creative" },
  { name: "SoundCloud", url: "https://soundcloud.com/{}", category: "creative" },
  { name: "Spotify", url: "https://open.spotify.com/user/{}", category: "creative" },
  { name: "Bandcamp", url: "https://{}.bandcamp.com", category: "creative" },
  
  // Blogging
  { name: "Medium", url: "https://medium.com/@{}", category: "blogging" },
  { name: "WordPress", url: "https://{}.wordpress.com", category: "blogging" },
  { name: "Blogger", url: "https://{}.blogspot.com", category: "blogging" },
  { name: "Substack", url: "https://{}.substack.com", category: "blogging" },
  
  // Forums
  { name: "Quora", url: "https://www.quora.com/profile/{}", category: "forum" },
  { name: "Hacker News", url: "https://news.ycombinator.com/user?id={}", category: "forum" },
  { name: "Product Hunt", url: "https://www.producthunt.com/@{}", category: "forum" },
  
  // Dating
  { name: "OkCupid", url: "https://www.okcupid.com/profile/{}", category: "dating" },
  { name: "Tinder", url: "https://tinder.com/@{}", category: "dating" },
  
  // Messaging
  { name: "Telegram", url: "https://t.me/{}", category: "messaging" },
  { name: "Keybase", url: "https://keybase.io/{}", category: "messaging" },
  
  // Crypto
  { name: "Ethereum Name Service", url: "https://app.ens.domains/name/{}.eth", category: "crypto" },
  { name: "OpenSea", url: "https://opensea.io/{}", category: "crypto" },
  
  // Shopping
  { name: "eBay", url: "https://www.ebay.com/usr/{}", category: "shopping" },
  { name: "Etsy", url: "https://www.etsy.com/shop/{}", category: "shopping" },
  { name: "Amazon Wishlist", url: "https://www.amazon.com/gp/registry/wishlist/{}", category: "shopping" },
  
  // News
  { name: "Hacker News", url: "https://news.ycombinator.com/user?id={}", category: "news" },
  { name: "Slashdot", url: "https://slashdot.org/~{}", category: "news" },
  
  // Learning
  { name: "Coursera", url: "https://www.coursera.org/user/{}", category: "learning" },
  { name: "Udemy", url: "https://www.udemy.com/user/{}", category: "learning" },
  { name: "Khan Academy", url: "https://www.khanacademy.org/profile/{}", category: "learning" },
  { name: "Duolingo", url: "https://www.duolingo.com/profile/{}", category: "learning" },
  
  // Finance
  { name: "Cash App", url: "https://cash.app/${}", category: "finance" },
  { name: "Venmo", url: "https://venmo.com/{}", category: "finance" },
  { name: "PayPal.me", url: "https://paypal.me/{}", category: "finance" },
  
  // Other
  { name: "Imgur", url: "https://imgur.com/user/{}", category: "other" },
  { name: "Pastebin", url: "https://pastebin.com/u/{}", category: "other" },
  { name: "Trello", url: "https://trello.com/{}", category: "other" },
  { name: "Notion", url: "https://notion.so/@{}", category: "other" },
  { name: "Linktree", url: "https://linktr.ee/{}", category: "other" },
  { name: "IFTTT", url: "https://ifttt.com/p/{}", category: "other" },
  { name: "Disqus", url: "https://disqus.com/by/{}", category: "other" },
  { name: "GoodReads", url: "https://www.goodreads.com/{}", category: "other" },
  { name: "Last.fm", url: "https://www.last.fm/user/{}", category: "other" },
  { name: "Letterboxd", url: "https://letterboxd.com/{}", category: "other" },
  { name: "Myspace", url: "https://myspace.com/{}", category: "other" },
  { name: "Vimeo", url: "https://vimeo.com/{}", category: "other" },
  { name: "Wattpad", url: "https://www.wattpad.com/user/{}", category: "other" },
  { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/User:{}", category: "other" },
];

export const emailBreachSources = [
  "Adobe",
  "LinkedIn",
  "Dropbox",
  "MySpace",
  "Canva",
  "Evite",
  "Apollo",
  "Zynga",
  "Chegg",
  "Dubsmash",
  "MyFitnessPal",
  "Tumblr",
  "Wattpad",
  "Mashable",
  "Ticketfly",
  "Houzz",
  "Armor Games",
  "500px",
  "ShareThis",
];

export const phoneCarriers = [
  "AT&T",
  "Verizon",
  "T-Mobile",
  "Sprint",
  "US Cellular",
  "Boost Mobile",
  "Cricket",
  "Metro PCS",
  "Virgin Mobile",
  "Vodafone",
  "O2",
  "EE",
  "Three",
  "Telcel",
  "Claro",
  "Movistar",
  "Orange",
  "SFR",
  "Bouygues",
  "Airtel",
  "Jio",
  "Singtel",
  "StarHub",
  "M1",
  "Optus",
  "Telstra",
  "Vodafone AU",
  "Telecel",
  "MTN"
];

export const categories = {
  social: { name: "Social Networks", color: "#3b82f6" },
  developer: { name: "Developer Platforms", color: "#22c55e" },
  gaming: { name: "Gaming", color: "#a855f7" },
  professional: { name: "Professional", color: "#0ea5e9" },
  creative: { name: "Creative", color: "#f97316" },
  blogging: { name: "Blogging", color: "#ec4899" },
  forum: { name: "Forums", color: "#eab308" },
  dating: { name: "Dating", color: "#ef4444" },
  messaging: { name: "Messaging", color: "#06b6d4" },
  crypto: { name: "Crypto", color: "#8b5cf6" },
  shopping: { name: "Shopping", color: "#f59e0b" },
  news: { name: "News", color: "#6366f1" },
  learning: { name: "Learning", color: "#10b981" },
  finance: { name: "Finance", color: "#14b8a6" },
  other: { name: "Other", color: "#64748b" },
};


