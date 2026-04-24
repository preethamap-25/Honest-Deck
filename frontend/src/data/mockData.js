export const mockUser = {
  name: "Arjun Mehta",
  email: "arjun.mehta@example.com",
  avatar: null,
  initials: "AM",
  plan: "Pro",
  joined: "January 2024",
  bio: "AI enthusiast & developer building the future.",
  usage: { messages: 1284, chatsTotal: 47, tokensUsed: 820000, tokensLimit: 1000000 },
};

const msg = (role, content, time) => ({
  id: `msg-${Math.random().toString(36).slice(2)}`,
  role,
  content,
  timestamp: time ?? new Date().toISOString(),
});

export const mockChats = [
  {
    id: "chat-1",
    title: "Explain quantum entanglement simply",
    pinned: true,
    model: "Seethru Pro",
    tags: ["science"],
    createdAt: "2025-04-18T10:00:00Z",
    updatedAt: "2025-04-18T10:05:00Z",
    messages: [
      msg("user", "Explain quantum entanglement simply", "2025-04-18T10:00:00Z"),
      msg("assistant", "Quantum entanglement is like having two magic coins that are always connected — flip one and the other instantly shows the opposite face, no matter how far apart they are. Einstein called it 'spooky action at a distance'.\n\nHere's the key: the coins don't have a definite state until you look at them. The moment you measure one, both instantly 'decide' their states simultaneously.", "2025-04-18T10:01:00Z"),
      msg("user", "Does it allow faster-than-light communication?", "2025-04-18T10:02:00Z"),
      msg("assistant", "No — and this is the subtle part! While the correlation happens instantly, you **can't use it to send information** faster than light.\n\nWhy? Because the result you get is random. You can't control whether your coin lands heads or tails. You only discover the correlation *after* comparing notes with your partner through a normal (slower) channel.\n\nSo entanglement is real, but it respects the speed-of-light limit for information transfer. Physics stays intact! 🎉", "2025-04-18T10:03:00Z"),
    ],
  },
  {
    id: "chat-2",
    title: "Write a Python FastAPI boilerplate",
    pinned: false,
    model: "Seethru Code",
    tags: ["code", "python"],
    createdAt: "2025-04-17T14:00:00Z",
    updatedAt: "2025-04-17T14:10:00Z",
    messages: [
      msg("user", "Write a Python FastAPI boilerplate with auth", "2025-04-17T14:00:00Z"),
      msg("assistant", "Here's a production-ready FastAPI boilerplate with JWT auth:\n\n```python\nfrom fastapi import FastAPI, Depends, HTTPException, status\nfrom fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm\nfrom jose import JWTError, jwt\nfrom passlib.context import CryptContext\nfrom datetime import datetime, timedelta\nfrom pydantic import BaseModel\n\nSECRET_KEY = \"your-secret-key\"\nALGORITHM = \"HS256\"\nACCESS_TOKEN_EXPIRE_MINUTES = 30\n\napp = FastAPI(title=\"My API\", version=\"1.0.0\")\npwd_context = CryptContext(schemes=[\"bcrypt\"], deprecated=\"auto\")\noauth2_scheme = OAuth2PasswordBearer(tokenUrl=\"token\")\n\nclass Token(BaseModel):\n    access_token: str\n    token_type: str\n\ndef create_access_token(data: dict):\n    to_encode = data.copy()\n    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)\n    to_encode.update({\"exp\": expire})\n    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)\n\n@app.post(\"/token\", response_model=Token)\nasync def login(form_data: OAuth2PasswordRequestForm = Depends()):\n    # Verify user here\n    token = create_access_token({\"sub\": form_data.username})\n    return {\"access_token\": token, \"token_type\": \"bearer\"}\n```", "2025-04-17T14:02:00Z"),
    ],
  },
  {
    id: "chat-3",
    title: "Plan a trip to Kyoto in spring",
    pinned: false,
    model: "Seethru Pro",
    tags: ["travel"],
    createdAt: "2025-04-16T09:00:00Z",
    updatedAt: "2025-04-16T09:15:00Z",
    messages: [
      msg("user", "Plan a 5-day trip to Kyoto in spring", "2025-04-16T09:00:00Z"),
      msg("assistant", "Here's your perfect 5-day Kyoto spring itinerary:\n\n**Day 1 – Arashiyama**\n- Morning: Bamboo Grove & Tenryu-ji Temple\n- Afternoon: Togetsukyo Bridge & Monkey Park\n- Evening: Dinner in the atmospheric Saga-Toriimoto district\n\n**Day 2 – Fushimi & Nishiki**\n- Fushimi Inari Taisha (go early for fewer crowds)\n- Nishiki Market for lunch\n- Gion district walk at dusk\n\n**Day 3 – Eastern Kyoto**\n- Kiyomizudera Temple\n- Sannenzaka & Ninenzaka stone-paved lanes\n- Maruyama Park (cherry blossom picnic!)\n\n**Day 4 – Nishiyama & Nijo**\n- Nijo Castle\n- Kinkakuji (Golden Pavilion)\n- Ryoanji rock garden\n\n**Day 5 – Day trip to Nara**\n- Todai-ji Temple & friendly deer\n- Back for sunset at Philosopher's Path\n\n**Best sakura spots:** Maruyama Park, Philosopher's Path, Kiyomizudera\n\nStay near Gion or Shijo for the best access. Budget ¥15,000–25,000/day.", "2025-04-16T09:03:00Z"),
    ],
  },
  {
    id: "chat-4",
    title: "Marketing copy for SaaS landing page",
    pinned: false,
    model: "Seethru Creative",
    tags: ["marketing"],
    createdAt: "2025-04-15T16:00:00Z",
    updatedAt: "2025-04-15T16:20:00Z",
    messages: [
      msg("user", "Write marketing copy for a SaaS project management tool", "2025-04-15T16:00:00Z"),
      msg("assistant", "**Headline:**\n*Ship faster. Together.*\n\n**Subheadline:**\nThe project management tool that gets out of your way — so your team can do its best work.\n\n**Hero paragraph:**\nStop drowning in status meetings and missed deadlines. Flowboard gives your team one beautiful workspace where ideas become tasks, tasks become done, and done becomes legendary.\n\n**Features:**\n⚡ **Real-time collaboration** — everyone's always in sync\n📊 **Smart timelines** — AI-powered scheduling that adapts\n🎯 **Focus mode** — zero distractions, maximum output\n🔗 **150+ integrations** — works with the tools you love\n\n**CTA:**\nStart free → No credit card required. Setup in 60 seconds.", "2025-04-15T16:03:00Z"),
    ],
  },
  {
    id: "chat-5",
    title: "Debug React useEffect memory leak",
    pinned: false,
    model: "Seethru Code",
    tags: ["code", "react"],
    createdAt: "2025-04-14T11:00:00Z",
    updatedAt: "2025-04-14T11:30:00Z",
    messages: [
      msg("user", "My useEffect is causing a memory leak warning", "2025-04-14T11:00:00Z"),
      msg("assistant", "The classic memory leak! It happens when you set state after a component unmounts. Here's the fix:\n\n```jsx\nuseEffect(() => {\n  let cancelled = false;\n\n  async function fetchData() {\n    const result = await someAPI.getData();\n    if (!cancelled) {\n      setData(result); // Only sets state if still mounted\n    }\n  }\n\n  fetchData();\n\n  return () => {\n    cancelled = true; // Cleanup: mark as cancelled on unmount\n  };\n}, []);\n```\n\nFor subscriptions, always return a cleanup function:\n\n```jsx\nuseEffect(() => {\n  const subscription = eventEmitter.subscribe(handler);\n  return () => subscription.unsubscribe(); // Cleanup!\n}, []);\n```\n\nThe `return` function in useEffect is your cleanup — React calls it when the component unmounts or before re-running the effect.", "2025-04-14T11:02:00Z"),
    ],
  },
];

export const MODELS = [
  { id: "seethru-pro", name: "Seethru Pro", description: "Best for general tasks", icon: "✦" },
  { id: "seethru-code", name: "Seethru Code", description: "Optimized for coding", icon: "⌥" },
  { id: "seethru-creative", name: "Seethru Creative", description: "Creative writing & ideas", icon: "◈" },
  { id: "seethru-fast", name: "Seethru Fast", description: "Quick responses", icon: "⚡" },
];

export const TAG_COLORS = {
  science:   "bg-purple-100 text-purple-700",
  code:      "bg-emerald-100 text-emerald-700",
  python:    "bg-blue-100 text-blue-700",
  react:     "bg-cyan-100 text-cyan-700",
  travel:    "bg-orange-100 text-orange-700",
  marketing: "bg-pink-100 text-pink-700",
};