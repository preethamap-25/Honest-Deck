// ─── Helper to build a structured fact-check result message ──────
const fc = (verdict, score, summary, claims, sources, assessment) =>
  `FACT_CHECK_START\n${JSON.stringify({ verdict, score, summary, claims, sources, assessment })}\nFACT_CHECK_END`;

const msg = (role, content, time) => ({
  id: `msg-${Math.random().toString(36).slice(2)}`,
  role,
  content,
  timestamp: time ?? new Date().toISOString(),
});

// ─── Mock User ────────────────────────────────────────────────────
export const mockUser = {
  name: "Arjun Mehta",
  email: "arjun.mehta@example.com",
  avatar: null,
  initials: "AM",
  plan: "Pro",
  joined: "January 2024",
  bio: "Fighting misinformation, one fact at a time.",
  usage: { checksRun: 47, falseNewsCaught: 18, tokensUsed: 820000, tokensLimit: 1000000 },
};

// ─── Mock Fact-Checks ─────────────────────────────────────────────
export const mockChecks = [
  {
    id: "check-1",
    title: "COVID-19 vaccines cause autism in children",
    verdict: "FALSE",
    score: 3,
    pinned: false,
    tags: ["Health", "Science"],
    createdAt: "2025-04-18T10:00:00Z",
    updatedAt: "2025-04-18T10:05:00Z",
    messages: [
      msg("user", "COVID-19 vaccines cause autism in children", "2025-04-18T10:00:00Z"),
      msg(
        "assistant",
        fc(
          "FALSE", 3,
          "This claim is demonstrably false. No credible scientific evidence supports a link between COVID-19 vaccines and autism spectrum disorder. This narrative is rooted in a retracted, fraudulent 1998 study.",
          [
            { text: "COVID-19 vaccines contain ingredients that trigger autism", verdict: "FALSE" },
            { text: "mRNA vaccines permanently alter human DNA", verdict: "FALSE" },
            { text: "Vaccine safety trials were rushed without proper testing", verdict: "MOSTLY_FALSE" },
            { text: "Side effects data was hidden from regulators", verdict: "FALSE" },
          ],
          [
            "WHO Vaccine Safety Surveillance — who.int/vaccines",
            "CDC — COVID-19 Vaccines Safety Monitoring (cdc.gov)",
            "The Lancet — Retraction of Wakefield study (2010)",
            "Nature Medicine — mRNA Vaccine Mechanism Review",
          ],
          "This claim traces back to a 1998 paper by Andrew Wakefield, which was retracted from The Lancet in 2010 after investigations found fabricated data and serious ethical violations. Wakefield's medical licence was revoked. Over 20 years of research spanning millions of children across dozens of countries has found zero causal link between any vaccine and autism. COVID-19 mRNA vaccines work by introducing a temporary genetic instruction to produce the spike protein — they cannot and do not interact with or alter the cell nucleus or DNA. This claim is a long-standing piece of misinformation that has caused measurable harm to public health.",
        ),
        "2025-04-18T10:01:30Z",
      ),
    ],
  },
  {
    id: "check-2",
    title: "5G towers spread COVID-19 by emitting harmful radiation",
    verdict: "FALSE",
    score: 1,
    pinned: false,
    tags: ["Technology", "Health"],
    createdAt: "2025-04-17T14:00:00Z",
    updatedAt: "2025-04-17T14:08:00Z",
    messages: [
      msg("user", "5G towers spread COVID-19 by emitting harmful radiation", "2025-04-17T14:00:00Z"),
      msg(
        "assistant",
        fc(
          "FALSE", 1,
          "5G radio waves are non-ionizing and physically cannot transmit biological pathogens. Viruses are biological entities — they cannot travel on electromagnetic signals.",
          [
            { text: "5G towers were installed specifically in COVID-19 outbreak areas first", verdict: "FALSE" },
            { text: "5G radiation weakens the immune system, enabling COVID-19", verdict: "FALSE" },
            { text: "Governments are hiding the link between 5G and COVID-19", verdict: "FALSE" },
            { text: "5G uses non-ionizing radiation", verdict: "TRUE" },
          ],
          [
            "WHO — Radiation & Health Fact Sheet (who.int)",
            "ICNIRP — 5G Safety Guidelines & Review",
            "Reuters Fact Check — 5G Towers & COVID-19",
            "BBC Reality Check — Debunking 5G Conspiracy",
          ],
          "Viruses are submicroscopic biological agents that require physical transmission. Radio waves — including 5G — are electromagnetic waves with no ability to carry or generate biological organisms. 5G operates in the non-ionizing portion of the spectrum, meaning it lacks sufficient energy to break chemical bonds or damage DNA. COVID-19 spread extensively in countries with no 5G infrastructure whatsoever (e.g., Iran, rural US). The World Health Organization, Public Health England, and the International Commission on Non-Ionizing Radiation Protection (ICNIRP) have all categorically rejected these claims.",
        ),
        "2025-04-17T14:02:00Z",
      ),
    ],
  },
  {
    id: "check-3",
    title: "Human activity is the primary cause of current climate change",
    verdict: "TRUE",
    score: 97,
    pinned: true,
    tags: ["Climate", "Science"],
    createdAt: "2025-04-16T09:00:00Z",
    updatedAt: "2025-04-16T09:10:00Z",
    messages: [
      msg("user", "Human activity is the primary cause of current climate change", "2025-04-16T09:00:00Z"),
      msg(
        "assistant",
        fc(
          "TRUE", 97,
          "Scientific consensus is overwhelming: human activities, primarily burning fossil fuels, are unequivocally the dominant driver of observed climate warming since the mid-20th century.",
          [
            { text: "Global temperatures have risen approximately 1.1°C since pre-industrial times", verdict: "TRUE" },
            { text: "97%+ of actively publishing climate scientists agree on human causation", verdict: "TRUE" },
            { text: "Atmospheric CO2 levels are at their highest in 800,000 years", verdict: "TRUE" },
            { text: "Natural factors alone cannot explain the observed rate of warming", verdict: "TRUE" },
          ],
          [
            "IPCC Sixth Assessment Report (2021) — ipcc.ch",
            "NASA Climate Change Evidence — climate.nasa.gov",
            "NOAA — Global Temperature Records (noaa.gov)",
            "Nature — Cook et al. 97% consensus study",
          ],
          "The IPCC Sixth Assessment Report (2021), produced by over 700 scientists from 90+ countries, states that human influence on the climate is 'unequivocal'. Multiple independent lines of evidence — direct temperature measurements, satellite data, ice core records, ocean heat content, glacial retreat, and sea level rise — all converge on the same conclusion. The rate of warming over the past 50 years is unprecedented in the past 2,000 years. While natural factors (solar variability, volcanic eruptions) do influence climate, models show these cannot account for more than a fraction of observed warming.",
        ),
        "2025-04-16T09:02:30Z",
      ),
    ],
  },
  {
    id: "check-4",
    title: "Electric cars produce more CO2 over their lifetime than petrol cars",
    verdict: "MOSTLY_FALSE",
    score: 21,
    pinned: false,
    tags: ["Climate", "Technology"],
    createdAt: "2025-04-15T16:00:00Z",
    updatedAt: "2025-04-15T16:12:00Z",
    messages: [
      msg("user", "Electric cars produce more CO2 over their lifetime than petrol cars", "2025-04-15T16:00:00Z"),
      msg(
        "assistant",
        fc(
          "MOSTLY_FALSE", 21,
          "This claim misleadingly focuses on manufacturing emissions while ignoring the full lifetime picture. Studies consistently show EVs produce 50–70% less lifetime CO2 than petrol cars in most developed countries.",
          [
            { text: "EV manufacturing produces more initial CO2 than petrol car manufacturing", verdict: "MIXED" },
            { text: "EVs produce more total CO2 over their entire lifetime than petrol cars", verdict: "MOSTLY_FALSE" },
            { text: "EV battery production requires environmentally damaging mining", verdict: "MIXED" },
            { text: "Electric vehicles are not truly 'zero-emission'", verdict: "MOSTLY_TRUE" },
          ],
          [
            "Transport & Environment — EV Lifecycle Analysis 2024",
            "MIT Energy Initiative — EV vs ICE Comparative Study",
            "BloombergNEF — Electric Vehicle Outlook 2024",
            "Union of Concerned Scientists — EV Emissions Guide",
          ],
          "This is a classic 'manufacturing focus' fallacy. While producing an EV battery does generate more upfront CO2 (roughly 30-40% higher than a comparable petrol car), EVs rapidly 'pay back' this carbon debt during operation. Over a full lifetime (150,000 km), EVs produce 50-70% less total CO2 in Europe and 30-55% less in the US, even accounting for current electricity generation mixes. As power grids decarbonise, this advantage grows. The claim is sometimes used selectively — citing only the manufacturing phase — to create a misleading impression of EVs' overall impact.",
        ),
        "2025-04-15T16:03:00Z",
      ),
    ],
  },
  {
    id: "check-5",
    title: "India's GDP growth was among the highest of major economies in 2024",
    verdict: "MOSTLY_TRUE",
    score: 84,
    pinned: false,
    tags: ["Economy", "World"],
    createdAt: "2025-04-14T11:00:00Z",
    updatedAt: "2025-04-14T11:08:00Z",
    messages: [
      msg("user", "India's GDP growth was among the highest of major economies in 2024", "2025-04-14T11:00:00Z"),
      msg(
        "assistant",
        fc(
          "MOSTLY_TRUE", 84,
          "India did achieve one of the highest GDP growth rates among major economies in 2024, consistently recording 6.5–8% growth, significantly outpacing most G20 nations.",
          [
            { text: "India is one of the world's fastest-growing major economies", verdict: "TRUE" },
            { text: "India's GDP grew approximately 7–8% in 2024", verdict: "MOSTLY_TRUE" },
            { text: "India will surpass Japan and Germany in nominal GDP by 2027", verdict: "MOSTLY_TRUE" },
            { text: "India's growth is entirely driven by manufacturing", verdict: "FALSE" },
          ],
          [
            "IMF World Economic Outlook 2024 — imf.org",
            "India NSO — National Statistical Office Growth Data",
            "World Bank — India Economic Monitor",
            "Reserve Bank of India — Annual Report 2024",
          ],
          "The IMF, World Bank, and India's own National Statistical Office (NSO) all confirm India as one of the fastest-growing major economies in 2024. Official figures show GDP growth in the 7–8% range, with the IMF projecting India as the fastest-growing G20 economy. The claim is broadly accurate, though framing matters — India's per-capita GDP remains much lower than developed economies despite strong growth rates. The specific figure depends on the measurement period and methodology used.",
        ),
        "2025-04-14T11:02:00Z",
      ),
    ],
  },
];

// ─── Models (now "Agent Modes") ────────────────────────────────────
export const AGENT_MODES = [
  { id: "balanced", name: "Balanced", description: "Best for general news checks", icon: "⚖️" },
  { id: "strict", name: "Strict", description: "Highest accuracy, slower", icon: "🔬" },
  { id: "quick", name: "Quick Scan", description: "Fast check for headlines", icon: "⚡" },
  { id: "deep", name: "Deep Dive", description: "Full investigative analysis", icon: "🔍" },
];

// Keep for backward compat
export const MODELS = AGENT_MODES;