import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Inline calculators (Deno can't import from src/lib) ───

function lifePathNumber(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const digits = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
  let sum = digits.split("").reduce((a, b) => a + parseInt(b, 10), 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split("").reduce((a, b) => a + parseInt(b, 10), 0);
  }
  return sum;
}

function personalYear(date: Date): number {
  const now = new Date();
  const digits = `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}${now.getFullYear()}`;
  let sum = digits.split("").reduce((a, b) => a + parseInt(b, 10), 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split("").reduce((a, b) => a + parseInt(b, 10), 0);
  }
  return sum;
}

function sunGateFromDate(date: Date): number {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  return ((dayOfYear - 1) % 64) + 1;
}

const GENE_KEYS: Record<number, { shadow: string; gift: string; siddhi: string }> = {
  1:{shadow:"Entropy",gift:"Freshness",siddhi:"Beauty"},2:{shadow:"Dislocation",gift:"Orientation",siddhi:"Unity"},3:{shadow:"Chaos",gift:"Innovation",siddhi:"Innocence"},4:{shadow:"Intolerance",gift:"Understanding",siddhi:"Forgiveness"},5:{shadow:"Impatience",gift:"Patience",siddhi:"Timelessness"},6:{shadow:"Conflict",gift:"Diplomacy",siddhi:"Peace"},7:{shadow:"Division",gift:"Guidance",siddhi:"Virtue"},8:{shadow:"Mediocrity",gift:"Style",siddhi:"Exquisiteness"},9:{shadow:"Inertia",gift:"Determination",siddhi:"Invincibility"},10:{shadow:"Self-Obsession",gift:"Naturalness",siddhi:"Being"},11:{shadow:"Obscurity",gift:"Idealism",siddhi:"Light"},12:{shadow:"Vanity",gift:"Discrimination",siddhi:"Purity"},13:{shadow:"Discord",gift:"Discernment",siddhi:"Empathy"},14:{shadow:"Compromise",gift:"Competence",siddhi:"Bounteousness"},15:{shadow:"Dullness",gift:"Magnetism",siddhi:"Florescence"},16:{shadow:"Indifference",gift:"Versatility",siddhi:"Mastery"},17:{shadow:"Opinion",gift:"Far-Sightedness",siddhi:"Omniscience"},18:{shadow:"Judgement",gift:"Integrity",siddhi:"Perfection"},19:{shadow:"Co-Dependence",gift:"Sensitivity",siddhi:"Sacrifice"},20:{shadow:"Superficiality",gift:"Self-Assurance",siddhi:"Presence"},21:{shadow:"Control",gift:"Authority",siddhi:"Valour"},22:{shadow:"Dishonour",gift:"Graciousness",siddhi:"Grace"},23:{shadow:"Complexity",gift:"Simplicity",siddhi:"Quintessence"},24:{shadow:"Addiction",gift:"Invention",siddhi:"Silence"},25:{shadow:"Constriction",gift:"Acceptance",siddhi:"Universal Love"},26:{shadow:"Pride",gift:"Artfulness",siddhi:"Invisibility"},27:{shadow:"Selfishness",gift:"Altruism",siddhi:"Selflessness"},28:{shadow:"Purposelessness",gift:"Totality",siddhi:"Immortality"},29:{shadow:"Half-Heartedness",gift:"Commitment",siddhi:"Devotion"},30:{shadow:"Desire",gift:"Lightness",siddhi:"Rapture"},31:{shadow:"Arrogance",gift:"Leadership",siddhi:"Humility"},32:{shadow:"Failure",gift:"Preservation",siddhi:"Veneration"},33:{shadow:"Forgetting",gift:"Mindfulness",siddhi:"Revelation"},34:{shadow:"Force",gift:"Strength",siddhi:"Majesty"},35:{shadow:"Hunger",gift:"Adventure",siddhi:"Boundlessness"},36:{shadow:"Turbulence",gift:"Humanity",siddhi:"Compassion"},37:{shadow:"Weakness",gift:"Equality",siddhi:"Tenderness"},38:{shadow:"Struggle",gift:"Perseverance",siddhi:"Honour"},39:{shadow:"Provocation",gift:"Dynamism",siddhi:"Liberation"},40:{shadow:"Exhaustion",gift:"Resolve",siddhi:"Divine Will"},41:{shadow:"Fantasy",gift:"Anticipation",siddhi:"Emanation"},42:{shadow:"Expectation",gift:"Detachment",siddhi:"Celebration"},43:{shadow:"Deafness",gift:"Insight",siddhi:"Epiphany"},44:{shadow:"Interference",gift:"Teamwork",siddhi:"Synarchy"},45:{shadow:"Dominance",gift:"Synergy",siddhi:"Communion"},46:{shadow:"Seriousness",gift:"Delight",siddhi:"Ecstasy"},47:{shadow:"Oppression",gift:"Transmutation",siddhi:"Transfiguration"},48:{shadow:"Inadequacy",gift:"Resourcefulness",siddhi:"Wisdom"},49:{shadow:"Reaction",gift:"Revolution",siddhi:"Rebirth"},50:{shadow:"Corruption",gift:"Equilibrium",siddhi:"Harmony"},51:{shadow:"Agitation",gift:"Initiative",siddhi:"Awakening"},52:{shadow:"Stress",gift:"Restraint",siddhi:"Stillness"},53:{shadow:"Immaturity",gift:"Expansion",siddhi:"Superabundance"},54:{shadow:"Greed",gift:"Aspiration",siddhi:"Ascension"},55:{shadow:"Victimisation",gift:"Freedom",siddhi:"Freedom"},56:{shadow:"Distraction",gift:"Enrichment",siddhi:"Intoxication"},57:{shadow:"Unease",gift:"Intuition",siddhi:"Clarity"},58:{shadow:"Dissatisfaction",gift:"Vitality",siddhi:"Bliss"},59:{shadow:"Dishonesty",gift:"Intimacy",siddhi:"Transparency"},60:{shadow:"Limitation",gift:"Realism",siddhi:"Justice"},61:{shadow:"Psychosis",gift:"Inspiration",siddhi:"Sanctity"},62:{shadow:"Intellect",gift:"Precision",siddhi:"Impeccability"},63:{shadow:"Doubt",gift:"Inquiry",siddhi:"Truth"},64:{shadow:"Confusion",gift:"Imagination",siddhi:"Illumination"},
};

function destinyMatrixNumbers(date: Date) {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  const reduce = (n: number): number => {
    while (n > 22) n = String(n).split("").reduce((a, b) => a + parseInt(b, 10), 0);
    return n;
  };
  const a = reduce(d), b = reduce(m), c = reduce(y);
  const d1 = reduce(a + b), e = reduce(a + b + c);
  const f = reduce(d1 + c), g = reduce(a + e), h = reduce(e + c);
  return { personality: a, soul: b, karmic: c, purpose: e, talent: d1, resource: f, left: g, right: h };
}

const SYSTEM_PROMPT = `You are Aethel Mirror — a decision clarity tool that synthesises astrology, Human Design, numerology, Gene Keys, and Destiny Matrix into one clear next move called the Third Way. Your tone is calm, direct, and specific. You never use vague spiritual platitudes. You speak like a wise, grounded friend who has studied these systems deeply. You do not hedge excessively. You give one clear recommendation.

When REAL CALCULATED CHART DATA is provided in the user message, you MUST reference specific planets, signs, houses, and aspects from that data in the astrology_reading field. Do not use generic phrases like "Mercury is in a communicative phase" — instead use the actual data: "With Mercury in Virgo in your 3rd house forming a trine to natal Jupiter..." Always ground your reading in the exact positions provided.

Format your response as valid JSON with exactly these fields:

{
  "astrology_reading": string (3-4 sentences, specific transits relevant to the domain and current date),
  "design_insights": array of 3 strings (each a specific Human Design or supporting system insight starting with em-dash),
  "third_way": string (1-3 sentences, a specific actionable recommendation the user can act on within 48-72 hours),
  "journal_prompt": string (one reflective question),
  "confidence_level": "low" | "medium" | "high" (your honest assessment of how aligned the systems are for this question)
}

Never break character. Never explain your methodology in the output. Just deliver the reading.`;

// ─── Inline fallback readings for edge function (30 total) ───
const FALLBACK_READINGS = [
  {domain:"Work & money",mode:"Coach me",astrology_reading:"Right now, Mercury is moving through a communicative zone that favours negotiations and direct conversations about value. Mars is lending you a sharper edge in professional settings — use it before this window closes. Saturn's steady hand is asking you to commit to one strategy rather than spreading across three.",design_insights:["— Your energy right now favours focused bursts over marathon sessions. Block two hours of deep work tomorrow morning and protect them fiercely.","— There's a pattern of over-delivering without asking for reciprocity. At this moment, practise naming your price before you present the work.","— Your design suggests you process financial decisions best after sleeping on them. Don't sign anything today — revisit it Thursday."],third_way:"Draft a one-page document that states what you want to be paid, what you will deliver, and what you won't. Send it to the person who needs to see it within 48 hours. No preamble, no apology.",journal_prompt:"What am I afraid will happen if I ask for exactly what I'm worth?",confidence_level:"high"},
  {domain:"Work & money",mode:"Coach me",astrology_reading:"At this moment, Venus is highlighting the relationship between your self-worth and your earning patterns. Jupiter's expansive energy is nearby but it rewards specificity, not scattergun effort. The lunar nodes are pointing toward a skill you've been undervaluing.",design_insights:["— Your system works best when you lead with a question rather than a pitch. Open your next meeting with curiosity, not a slide deck.","— There's a gate active in your design right now that amplifies persuasion — but only when you genuinely believe in what you're selling.","— You tend to collapse 'busy' and 'productive' into one feeling. Right now, subtract one commitment to create space for the one that matters."],third_way:"Identify the single project or client that generates the most energy (not just revenue) and spend 90 minutes this week writing down how to double your involvement there. Cancel or delegate one thing that drains you to make room.",journal_prompt:"If money were handled, what work would I still choose to do?",confidence_level:"medium"},
  {domain:"Work & money",mode:"Coach me",astrology_reading:"Right now, the sun is illuminating your sector of public reputation, making this a potent window for visibility moves. Pluto's slow pressure is dissolving an old identity around work — let it. Mercury retrograde shadow is approaching, so finalise contracts this week rather than next.",design_insights:["— Your design suggests you're a closer, not an opener. Let someone else make the introduction and then step in with depth.","— At this moment, your sacral energy is high — trust gut responses to opportunities rather than overthinking pros and cons lists.","— You carry a pattern of loyalty to structures that have outgrown you. Right now, loyalty to your own growth is the priority."],third_way:"Write a 3-sentence message to someone in your network who has the kind of role or income you want. Ask them one specific question about how they got there. Send it before Friday.",journal_prompt:"What professional identity am I holding onto that no longer fits?",confidence_level:"high"},
  {domain:"Work & money",mode:"Coach me",astrology_reading:"At this moment, a trine between Jupiter and your career sector is creating unusual ease around expansion — but only if you act on it rather than just noticing it. Saturn is asking for structure: ideas without timelines will evaporate. The moon's current phase favours planting, not harvesting.",design_insights:["— Your energy type processes best through movement. Take your biggest financial question on a walk before you make a spreadsheet.","— Right now, there's tension between what feels safe and what feels alive. Your design says: choose alive, but build one safety net first.","— You have a tendency to wait for permission. At this moment, the permission you need is the one you give yourself."],third_way:"Open a blank document and write the job description for the role you actually want — even if it doesn't exist yet. Share it with one trusted person within 72 hours and ask: 'Does this exist somewhere?'",journal_prompt:"What would I build if I knew I couldn't be judged for it?",confidence_level:"medium"},
  {domain:"Work & money",mode:"Coach me",astrology_reading:"Right now, Uranus is electrifying your financial sector with unexpected possibilities, but they require you to release a fixed idea about how money 'should' arrive. Neptune's fog is lifting from a project that confused you last month — clarity is returning. The north node is pulling you toward earned authority.",design_insights:["— Your design shows you work best with a defined container. Set a hard stop on your workday this week and notice what happens to your output.","— At this moment, your throat centre is activated — speak your ideas out loud to someone before writing them down.","— You process rejection as data, not verdict. Use that superpower right now: pitch something you expect to be told no to."],third_way:"Pick the financial goal that scares you slightly and break it into three actions. Do the first one tomorrow. Text someone you trust that you've started.",journal_prompt:"Where am I conflating financial security with emotional security?",confidence_level:"high"},
  {domain:"Work & money",mode:"Reflect with me",astrology_reading:"At this moment, the moon is waning through your sector of inner resources, inviting reflection rather than action on financial matters. Saturn's presence asks you to look honestly at what structures are actually supporting you versus the ones you maintain out of habit. Venus whispers that rest is also a form of investment.",design_insights:["— Your design right now is asking you to pause the optimisation loop. Not everything needs to be more efficient — some things need to be felt.","— There's a channel in your chart that processes abundance through gratitude rather than accumulation. At this moment, count what you have before chasing what you don't.","— You carry a deep pattern of proving your worth through output. Right now, your worth is not up for debate."],third_way:"Sit for ten minutes tonight with no screens and ask yourself: 'Am I building something I actually want to live inside?' Write whatever comes up — no editing, no action plan. Just listen.",journal_prompt:"When did I last feel truly abundant — and what was I doing?",confidence_level:"medium"},
  {domain:"Work & money",mode:"Reflect with me",astrology_reading:"Right now, Neptune is softening the edges of your professional ambitions, not to weaken them but to reveal which ones are genuinely yours versus inherited. The south node is releasing an old financial pattern — let it go without replacing it immediately. Mercury's current position favours journaling over strategising.",design_insights:["— At this moment, your emotional authority needs more time than your mind wants to give it. Delay the decision by 48 hours and see what shifts.","— Your design suggests you absorb other people's stress about money and mistake it for your own. Right now, ask: whose anxiety is this?","— There's a gate of rest active in your chart. Honouring it will paradoxically generate more creative output than pushing through."],third_way:"Before you make any work decision this week, write down three things about your current situation that are genuinely working. Let that list sit on your desk where you can see it. Decide from sufficiency, not scarcity.",journal_prompt:"What would I stop doing immediately if I trusted that enough money would come?",confidence_level:"low"},
  {domain:"Work & money",mode:"Reflect with me",astrology_reading:"At this moment, Pluto is deep in your sector of shared resources, transforming how you think about collaboration and ownership. The current lunar phase supports release — this is a time for letting go of projects that have completed their purpose. Jupiter's retrograde asks you to find growth inward.",design_insights:["— Right now, your design is highlighting the difference between being needed and being valued. Sit with which one you've been optimising for.","— Your system processes career transitions slowly and deeply. At this moment, trust the underground work happening beneath your conscious awareness.","— There's a pattern of taking responsibility for outcomes that aren't yours to carry. Right now, practise the sentence: 'That's not mine to fix.'"],third_way:"Write a letter to yourself from five years in the future. Let that version of you describe what your work life looks like. Don't censor it. Read it once, then put it away for a week.",journal_prompt:"What am I carrying in my work life that I've already outgrown?",confidence_level:"medium"},
  {domain:"Work & money",mode:"Reflect with me",astrology_reading:"Right now, the sun is moving through a reflective angle to your career house, dimming the spotlight temporarily so you can audit what's working backstage. Mars is in a receptive sign — aggression won't serve you, but honest inventory will. The current Mercury placement favours private thinking over public declarations.",design_insights:["— At this moment, your design is in a consolidation phase. New inputs will overwhelm — focus on integrating what you've already learned.","— Your sacral response is quieter right now, and that's information, not a problem. Low energy around a project means it may be completing.","— You have a tendency to define rest as 'strategic recovery.' Right now, try rest with no purpose attached."],third_way:"Clear one hour this weekend. Sit somewhere comfortable and list every professional commitment you currently hold. Circle the three that make you feel most like yourself. Let the rest blur for now.",journal_prompt:"If I removed the word 'should' from my vocabulary, what would change about my work?",confidence_level:"low"},
  {domain:"Work & money",mode:"Reflect with me",astrology_reading:"At this moment, Venus is retrograde in your value sector, revisiting old questions about what you charge, what you tolerate, and what you deserve. This isn't a time for new financial ventures — it's a time for renegotiating your relationship with money itself. The nodes are asking you to release a scarcity story.",design_insights:["— Right now, your design is amplifying sensitivity to environments. If your workspace feels heavy, change it before trying to change your output.","— At this moment, there's wisdom in boredom. The project that excites you least may be the one teaching you the most.","— Your chart suggests you need beauty in your work environment to function well. Add one beautiful object to your desk this week."],third_way:"Take your biggest money worry and write it as a question instead of a statement. 'I can't afford this' becomes 'How might I afford this?' Sit with the question for 48 hours before answering it.",journal_prompt:"What is my earliest memory of learning what money means?",confidence_level:"medium"},
  {domain:"Love & people",mode:"Both",astrology_reading:"Right now, Venus is transiting your intimacy sector, deepening the quality of connection you're drawn to while making surface-level interactions feel hollow. Mars is adding heat to conversations that have been simmering — expect directness from others and practise it yourself. The moon's current position favours vulnerability over performance.",design_insights:["— Your design at this moment favours one-on-one depth over group dynamics. Cancel the group plan and have the real conversation instead.","— There's a gate of intimacy active in your chart that requires emotional safety before it opens. Right now, create that safety by going first.","— You tend to process relationship dynamics through logic, but at this moment your body knows before your mind does. Trust the physical signal."],third_way:"Identify the one person you've been meaning to have an honest conversation with. Send them a message in the next 48 hours that says: 'There's something I've been wanting to talk about. When can we sit down?' Don't script what comes next.",journal_prompt:"What am I protecting by keeping this conversation unspoken?",confidence_level:"high"},
  {domain:"Love & people",mode:"Both",astrology_reading:"At this moment, Mercury in your relationship sector is urging clear communication, but Neptune's square is making it easy to hear what you want to hear rather than what's being said. The current eclipse season is shaking loose relationship patterns that have calcified. Jupiter offers expansion if you're willing to be uncomfortable first.",design_insights:["— Right now, your emotional wave is cresting — decisions about people made at the peak will feel different at the trough. Wait for neutral ground.","— Your design suggests you attract people who need your clarity, but at this moment you need someone who offers theirs. Seek that person out.","— There's a channel of listening activated in your chart. Right now, the most powerful thing you can do in any relationship is shut up and hear them."],third_way:"Choose the relationship that's taking up the most mental space right now. Write down what you actually need from that person — not what you think is reasonable, but what you need. Then ask yourself if you've ever said it out loud. If not, say it within 72 hours.",journal_prompt:"Am I in love with this person, or with the version of them I've constructed?",confidence_level:"medium"},
  {domain:"Love & people",mode:"Both",astrology_reading:"Right now, the full moon is illuminating your partnership axis, making relationship dynamics impossible to ignore. Pluto's involvement suggests a power dynamic is ready to shift — someone needs to name it. Venus trine Saturn is offering stability to connections that are willing to be honest.",design_insights:["— At this moment, your aura is drawing people toward you more than usual. Be intentional about who you let in close.","— Your design processes love through service — but right now, check if your service has become a way to avoid being seen yourself.","— There's a gate of solitude active alongside your connection gates. Right now, the most loving thing you can do might be to spend an evening alone."],third_way:"Take 20 minutes tonight to write a list of what you're currently giving in your closest relationship and what you're receiving. If the lists are dramatically unequal, that's your conversation starter. Bring it up gently within 48 hours.",journal_prompt:"What would this relationship look like if I stopped managing it?",confidence_level:"high"},
  {domain:"Love & people",mode:"Both",astrology_reading:"At this moment, Mars in your communication sector is making you more blunt than diplomatic — and that might be exactly what's needed. The south node is releasing a pattern of people-pleasing that has kept certain relationships comfortable but stagnant. Venus is asking: can you love someone and disappoint them at the same time?",design_insights:["— Right now, your design is highlighting the difference between harmony and authenticity. You've been choosing harmony. At this moment, choose truth.","— Your throat centre is activated for difficult conversations. The words will come if you start — don't wait until you have the perfect script.","— You carry a pattern of emotional labour that others have come to expect. Right now, gently redistribute that weight."],third_way:"Set one boundary this week that you've been avoiding. It can be small: 'I can't do Saturday' or 'I need you to ask before assuming.' Say it clearly, without justification. Notice how it feels to not explain yourself.",journal_prompt:"Whose approval am I still trying to earn, and what would happen if I stopped?",confidence_level:"medium"},
  {domain:"Love & people",mode:"Both",astrology_reading:"Right now, the new moon is seeding something fresh in your relationship sector — this is a beginning energy, not a resolution energy. Don't try to conclude anything. Saturn is asking for patience with people who are growing at a different pace than you. Mercury favours written communication over spoken this week.",design_insights:["— At this moment, your design is craving depth but your schedule is full of surface. Clear one social engagement this week and replace it with one real conversation.","— Your emotional authority needs space between feeling and speaking. Right now, the pause is not avoidance — it's wisdom.","— There's a gate of forgiveness active in your chart. At this moment, it's not about them deserving it — it's about you being free."],third_way:"Write a handwritten note to someone who matters to you. It doesn't need to be long — three sentences about what they mean to you. Mail it or hand it to them within 72 hours. Don't send a text instead.",journal_prompt:"What have I been waiting for someone else to say first?",confidence_level:"low"},
  {domain:"Visibility",mode:"Coach me",astrology_reading:"At this moment, the sun is in your public sector creating a natural spotlight — but you keep stepping out of it. Leo energy is asking you to claim your stage without apology. Mercury's current trine to your midheaven means your words carry more weight than usual this week.",design_insights:["— Your design right now favours invitations over self-promotion. Put your work where it can be found, then let people come to you.","— At this moment, your projector energy is amplified — the right person is watching, even if you can't see them yet.","— You have a pattern of perfecting in private rather than shipping in public. Right now, 80% and visible beats 100% and hidden."],third_way:"Publish one piece of work, thought, or creation within 48 hours. It doesn't need to be polished. Post it where your audience lives — not where it feels safest. Add no disclaimers.",journal_prompt:"What am I really afraid people will see if I become more visible?",confidence_level:"high"},
  {domain:"Visibility",mode:"Coach me",astrology_reading:"Right now, Jupiter is expanding your network sector, meaning every introduction has unusual leverage. Mars in your creative house is urging you to stop planning your content and start making it. The north node is pulling you toward a public identity you haven't fully claimed yet.",design_insights:["— At this moment, your design suggests you build authority through consistency, not virality. Show up again this week the same way you did last week.","— Your sacral energy is responding strongly to a creative format you haven't tried yet. Right now, experiment with one new medium — audio, video, or long-form.","— There's a gate of storytelling active in your chart. At this moment, your personal experience is more compelling than your expertise."],third_way:"Reach out to one person whose platform is slightly larger than yours and propose a collaboration — a conversation, a swap, a co-creation. Send the message within 72 hours. Be specific about what you're offering, not just what you're asking for.",journal_prompt:"Who do I want to be known by, and what do I want them to know me for?",confidence_level:"medium"},
  {domain:"Visibility",mode:"Coach me",astrology_reading:"At this moment, Pluto is transforming your sector of self-expression, burning away the version of your public persona that was built to please. The current lunar phase supports bold moves — anything you put out now has staying power. Venus is adding aesthetic potency to your visual presence.",design_insights:["— Right now, your design is asking you to lead with your wound, not your win. Vulnerability will land harder than expertise at this moment.","— Your energy type magnetises when you speak from lived experience. At this moment, theory repels — truth attracts.","— There's a channel of timing active in your chart. Right now, the hesitation you feel is not intuition — it's fear dressed as wisdom. Move."],third_way:"Write down the one thing you know deeply from experience that most people in your field are afraid to say. Turn it into a single post or message. Publish it within 48 hours with zero hedging language.",journal_prompt:"If I couldn't fail publicly, what would I create next?",confidence_level:"high"},
  {domain:"Visibility",mode:"Coach me",astrology_reading:"Right now, Mercury is stationing direct in your creative sector, releasing months of pent-up ideas. Saturn provides the discipline to actually execute one. The current aspects favour depth over breadth — one excellent piece beats five mediocre ones this week.",design_insights:["— At this moment, your design is highlighting the gap between your inner authority and your outer brand. Right now, close that gap by one degree.","— Your throat centre is buzzing with expression energy. Channel it into the format that feels most natural — don't force yourself into someone else's medium.","— You process visibility anxiety somatically. Right now, if your chest tightens before you post, that's the sign you're on the right track."],third_way:"Audit your public presence for 15 minutes. Find the one thing that no longer represents who you are right now and remove or update it. Then add one new thing that does. Complete both within 72 hours.",journal_prompt:"What part of my public identity am I maintaining out of obligation rather than truth?",confidence_level:"medium"},
  {domain:"Visibility",mode:"Coach me",astrology_reading:"At this moment, Uranus is electrifying your self-expression sector with an urge to break format. The old way of showing up is boring you — and if it's boring you, it's boring your audience. The sun-Uranus conjunction says: surprise them. Surprise yourself.",design_insights:["— Right now, your design says your next level of visibility requires you to stop explaining and start demonstrating. Show the work, not the process.","— At this moment, there's a gate of provocation active — not antagonism, but the kind of truth that makes people stop scrolling.","— Your energy is magnetic when you're genuinely enjoying yourself. Right now, if creating content feels like a chore, change the format until it feels like play."],third_way:"Do one thing publicly this week that breaks your usual pattern. If you always write, record your voice. If you always teach, tell a story. If you always polish, post raw. Ship it within 48 hours.",journal_prompt:"What would my visibility look like if I stopped performing and started playing?",confidence_level:"high"},
  {domain:"Body & health",mode:"Reflect with me",astrology_reading:"Right now, the moon is transiting your sixth house of daily routines and health, amplifying body awareness. Neptune's soft influence is blurring the line between fatigue and resistance — sit with which one it truly is before acting. Saturn in your wellness sector is asking for one sustainable practice, not a complete overhaul.",design_insights:["— At this moment, your body is speaking louder than your mind. The ache, the tension, the craving — each is a message. Right now, listen before you optimise.","— Your design processes stress somatically. Right now, the tightness in your shoulders isn't about posture — it's about what you're carrying emotionally.","— There's a gate of rest active in your chart. At this moment, your body doesn't need a new protocol — it needs permission to stop."],third_way:"Tonight, before bed, place your hands on your body wherever it's holding tension. Ask it, silently: 'What do you need?' Sit with whatever answer comes for five minutes. Don't act on it yet — just hear it.",journal_prompt:"When did I last trust my body's signals without overriding them with logic?",confidence_level:"low"},
  {domain:"Body & health",mode:"Reflect with me",astrology_reading:"At this moment, Mars is moving through a restorative zone, which means pushing harder will produce diminishing returns. The current Venus placement is emphasising pleasure as medicine — not indulgence, but genuine sensory nourishment. Chiron is active in your health sector, surfacing old patterns around body control.",design_insights:["— Right now, your energy type needs cyclical rest, not linear productivity. At this moment, honour the dip instead of caffeinating through it.","— Your design suggests your gut instinct about food and movement is more accurate than any external protocol. Right now, eat what your body is actually asking for.","— There's a pattern of treating your body as a tool rather than a partner. At this moment, shift from 'what can my body do for me' to 'what can I do for my body.'"],third_way:"Choose one health habit you've been forcing and pause it for 72 hours. Replace it with something your body is genuinely craving — a walk, extra sleep, a long bath, different food. Notice what happens when you stop overriding and start responding.",journal_prompt:"What health practice am I maintaining out of discipline that my body actually resents?",confidence_level:"medium"},
  {domain:"Body & health",mode:"Reflect with me",astrology_reading:"Right now, Pluto is deep in your wellness sector, dismantling health identities that no longer serve you. The person you were when you built your current routine is not the person you are now. The current new moon supports planting one gentle seed of change rather than uprooting everything at once.",design_insights:["— At this moment, your emotional wave is affecting your appetite and energy levels. Don't diagnose — just observe the pattern over the next three days.","— Your design shows a deep connection between creativity and physical vitality. Right now, moving your body playfully will do more than any structured workout.","— There's a channel of healing activated in your chart. At this moment, your body is already healing something — your job is to not interfere."],third_way:"Spend 15 minutes this week mapping your energy across a typical day — when it peaks, when it dips, when it flatlines. Don't try to fix the pattern. Just see it clearly for the first time. Write it down and keep it visible.",journal_prompt:"What is my body trying to heal that my mind keeps interrupting?",confidence_level:"medium"},
  {domain:"Body & health",mode:"Reflect with me",astrology_reading:"At this moment, Jupiter is in your self-care sector, expanding your capacity for rest if you let it. The tendency to use expansion energy for doing more is strong — resist it. Neptune is dissolving rigid health rules, inviting a softer, more intuitive approach. The waning moon supports release.",design_insights:["— Right now, your design is asking you to redefine 'healthy' on your own terms. At this moment, someone else's wellness routine is noise.","— Your body processes emotional stress through your digestive system. At this moment, the bloating or tension isn't just physical — it's processing something unspoken.","— There's a gate of surrender active in your chart. Right now, surrendering control of your body's timeline is the most healing thing you can do."],third_way:"Write a list of five things you've been told are 'good for you' that you actually dislike doing. Cross off two permanently. Replace them with two things that make your body feel genuinely good. Start this week.",journal_prompt:"Whose definition of health am I living by?",confidence_level:"low"},
  {domain:"Body & health",mode:"Reflect with me",astrology_reading:"Right now, the sun is illuminating your body-mind connection with unusual clarity. Chiron's current transit is making old wounds visible — not to reopen them but to show you how far you've come. Mercury's position favours journaling about your body rather than researching new protocols.",design_insights:["— At this moment, your nervous system is calibrating. The restlessness isn't a sign to do more — it's your body recalibrating to a new baseline.","— Your design suggests you need nature contact right now more than any supplement or routine. Thirty minutes outside with no podcast will do more than you expect.","— Right now, there's a pattern of disconnecting from your body during stress. At this moment, place one hand on your heart and one on your belly. Breathe. That's the reset."],third_way:"Go outside for 20 minutes tomorrow with nothing in your ears and nothing in your hands. Walk slowly. Let your body lead the pace. When you return, write one sentence about what your body told you.",journal_prompt:"What conversation does my body want to have that I keep postponing?",confidence_level:"high"},
  {domain:"Life direction",mode:"Both",astrology_reading:"At this moment, there's a grand cross forming that touches every major life area simultaneously — work, relationships, health, and identity. This is not chaos; it's a restructuring. Saturn demands you choose one priority while Jupiter insists everything is possible. The truth, right now, is somewhere between those two.",design_insights:["— Your design right now is overwhelmed not because there's too much happening, but because you're trying to hold it all consciously. At this moment, your body knows the priority — your mind is overcomplicating it.","— There's a pattern of believing everything must be resolved at once. Right now, pick the domino that, if it fell, would move three others.","— Your energy at this moment is scattered across too many frequencies. Ground into one thing for 90 minutes tomorrow and watch the noise settle."],third_way:"Write every open question and unresolved decision on separate pieces of paper. Spread them out. Remove everything that can wait two weeks without consequence. What's left is your actual priority. Commit to that one thing for the next 72 hours.",journal_prompt:"What if everything doesn't need to be figured out at the same time?",confidence_level:"medium"},
  {domain:"Life direction",mode:"Both",astrology_reading:"Right now, the eclipses are activating your axis of self and other, making every area of life feel like it's in dialogue with every other area. Pluto is adding depth pressure — surface-level fixes won't hold. Mercury is asking you to name the one feeling underneath all the noise, because right now it's the same feeling wearing different costumes.",design_insights:["— At this moment, your design says the overwhelm is a signal, not a flaw. Right now, your system is processing a level-up that hasn't landed yet.","— Your emotional wave is peaking, which colours everything with urgency. Right now, nothing is actually as urgent as it feels.","— There's a channel of simplification active in your chart. At this moment, complexity is the enemy. Choose the simplest version of every decision."],third_way:"Set a timer for 10 minutes. Write continuously about everything that's weighing on you — work, love, body, money, all of it. When the timer stops, read it back and circle the sentence that hits hardest. That's your thread to pull. Act on just that one thread within 48 hours.",journal_prompt:"What is the one feeling I keep avoiding that's showing up in every area of my life?",confidence_level:"low"},
  {domain:"Life direction",mode:"Both",astrology_reading:"At this moment, Jupiter is expanding your vision while Saturn is contracting your resources, creating a tension that demands creative problem-solving. The current Venus-Mars conjunction is adding passion to whatever you focus on — but it punishes divided attention. The lunar nodes are asking: what season of life are you actually in?",design_insights:["— Right now, your design is in a transition phase. At this moment, the discomfort isn't a sign you're in the wrong place — it's a sign you're between places.","— Your system needs clear containers right now. At this moment, time-boxing your worries (literally scheduling 20 minutes for each life area) will free more energy than trying to solve them all fluidly.","— There's a gate of patience active in your chart. At this moment, the most powerful move is strategic waiting — not passive, but intentional."],third_way:"Divide tomorrow into three blocks: morning for the life area that needs action, afternoon for the one that needs rest, evening for the one that needs connection. Follow the plan without switching contexts. See how it feels to give each area its own space.",journal_prompt:"What season of life am I pretending I'm not in?",confidence_level:"medium"},
  {domain:"Life direction",mode:"Both",astrology_reading:"Right now, the stellium in your foundational sector is rebuilding your sense of home — internally and externally. This reorganisation is rippling into work, relationships, and health because the foundation affects everything. Mars is giving you the energy to act, but only on what's truly yours to handle. The rest needs to be released.",design_insights:["— At this moment, your design is pulling you toward your core — the non-negotiable centre of who you are. Right now, decisions made from that centre will be correct; decisions made from the periphery will create more chaos.","— Your energy type needs solitude right now to sort signal from noise. At this moment, cancel one social obligation guilt-free.","— There's a pattern of over-functioning in every life area simultaneously. Right now, choose to under-function in one area deliberately and watch nothing collapse."],third_way:"Identify the one area of your life where you can intentionally do less this week without real consequences. Give yourself full permission to coast there. Redirect that energy to the area that truly can't wait. Name both areas out loud to someone you trust within 48 hours.",journal_prompt:"What am I maintaining out of fear that would actually be fine if I let it go?",confidence_level:"high"},
  {domain:"Life direction",mode:"Both",astrology_reading:"At this moment, Uranus is disrupting your comfort zone while Neptune is dissolving your clarity about why it matters. This double transit is disorienting by design — it's creating space for something genuinely new. The sun's current position says: you don't need to see the whole path, just the next three steps.",design_insights:["— Right now, your design is asking you to stop managing and start feeling. At this moment, your body has an answer your mind hasn't caught up to yet.","— Your chart shows a pattern of collecting input when what you need is output. At this moment, stop researching and start experimenting.","— There's a gate of courage active right now. At this moment, the brave thing and the right thing are the same thing."],third_way:"Tonight, write down the three decisions that have been circling your mind. For each, write the option you would choose if you weren't afraid. Sleep on it. Tomorrow, act on the smallest one. Let momentum build from there.",journal_prompt:"What would I do right now if I weren't waiting for certainty?",confidence_level:"medium"},
];

function selectFallback(domain: string, mode: string) {
  const dl = domain.toLowerCase();
  const ml = mode.toLowerCase();
  const exact = FALLBACK_READINGS.filter(r => r.domain.toLowerCase() === dl && r.mode.toLowerCase() === ml);
  if (exact.length > 0) return exact[Math.floor(Math.random() * exact.length)];
  const domainOnly = FALLBACK_READINGS.filter(r => r.domain.toLowerCase() === dl);
  if (domainOnly.length > 0) return domainOnly[Math.floor(Math.random() * domainOnly.length)];
  const catchAll = FALLBACK_READINGS.filter(r => r.domain === "Life direction");
  return catchAll[Math.floor(Math.random() * catchAll.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const { domain, question, mode, birthDate, birthPlace, birthTime, birthLat, birthLng, birthTimezone, language, regenerationFeedback } = body;
    if (!domain || !question) throw new Error("Missing domain or question");

    // ─── Fetch user memory context ───
    let memoryContext = "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData } = await userClient.auth.getClaims(token);
        if (claimsData?.claims?.sub) {
          const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          const { data: memories } = await adminClient
            .from("user_memory")
            .select("memory_type, memory_value, frequency")
            .eq("user_id", claimsData.claims.sub as string)
            .order("frequency", { ascending: false })
            .limit(10);

          if (memories && memories.length > 0) {
            const themes = memories.filter((m: any) => m.memory_type === "theme").map((m: any) => m.memory_value).join(", ");
            const patterns = memories.filter((m: any) => m.memory_type === "pattern").map((m: any) => m.memory_value).join("; ");
            const fears = memories.filter((m: any) => m.memory_type === "recurring_fear").map((m: any) => m.memory_value).join(", ");
            const parts = [];
            if (themes) parts.push(`Recurring themes: ${themes}`);
            if (patterns) parts.push(`Observed patterns: ${patterns}`);
            if (fears) parts.push(`Recurring fears: ${fears}`);
            if (parts.length > 0) {
              memoryContext = `\n\nMEMORY CONTEXT: ${parts.join(". ")}. Use this context to make the reading feel like a continuation, not a cold start. Reference their journey if relevant.`;
            }
          }
        }
      } catch (err) {
        console.warn("Memory fetch failed:", err);
      }
    }

    // ─── Calculate numerology / Gene Keys / Destiny Matrix from birth date ───
    let calculatorContext = "";
    if (birthDate && birthDate !== "unknown") {
      try {
        let parsedDate: Date;
        const dateParts = birthDate.split("/");
        if (dateParts.length === 3) {
          parsedDate = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[0], 10));
        } else {
          parsedDate = new Date(birthDate);
        }
        if (!isNaN(parsedDate.getTime())) {
          const lp = lifePathNumber(parsedDate);
          const py = personalYear(parsedDate);
          const sg = sunGateFromDate(parsedDate);
          const gk = GENE_KEYS[sg] || GENE_KEYS[1];
          const dm = destinyMatrixNumbers(parsedDate);
          calculatorContext = `\nNumerology life path: ${lp}\nPersonal year: ${py}\nSun gate: ${sg}\nGene Key: Shadow of ${gk.shadow}, Gift of ${gk.gift}, Siddhi of ${gk.siddhi}\nDestiny Matrix: personality ${dm.personality}, soul ${dm.soul}, purpose ${dm.purpose}`;
        }
      } catch {
        // Calculator failed — continue without it
      }
    }

    // ─── Crisis detection pre-check ───
    try {
      const crisisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a safety classifier. Given a user's question, determine if it contains any signals of mental health crisis, suicidal ideation, self-harm, or acute emotional distress.\n\nReturn JSON only:\n{\n  "is_crisis": boolean,\n  "confidence": "low" | "medium" | "high"\n}`,
            },
            { role: "user", content: question },
          ],
        }),
      });

      if (crisisResponse.ok) {
        const crisisData = await crisisResponse.json();
        let crisisContent = crisisData.choices?.[0]?.message?.content || "";
        crisisContent = crisisContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        try {
          const crisisResult = JSON.parse(crisisContent);
          if (crisisResult.is_crisis === true && (crisisResult.confidence === "medium" || crisisResult.confidence === "high")) {
            return new Response(JSON.stringify({
              is_crisis: true,
              confidence: crisisResult.confidence,
              domain,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        } catch { /* crisis parse failed, continue with reading */ }
      }
    } catch (err) {
      console.error("Crisis check failed, continuing with reading:", err);
    }

    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    // Build language instruction
    const LANGUAGE_MAP: Record<string, string> = { en: "English", es: "Spanish", fr: "French", pt: "Brazilian Portuguese" };
    const langName = LANGUAGE_MAP[language || "en"] || "English";
    const langInstruction = language && language !== "en"
      ? `\nRespond entirely in ${langName}. All reading text, Third Way, and journal prompt must be in ${langName}.`
      : "";

    // Build domain-specific instruction for "Life direction"
    const everythingInstruction = (domain === "Life direction" || domain === "Everything at once")
      ? `\n\nSPECIAL INSTRUCTION FOR 'LIFE DIRECTION' DOMAIN:\nThe user is overwhelmed and cannot identify a single decision to focus on. Your most important job here is to find THE ONE thread that, if pulled, would create the most movement across all areas. Do not try to address everything — pick the single highest leverage decision point and make the Third Way about that one thing only. Start the astrology reading with: 'Of everything you're carrying, the one thread worth pulling first is...'`
      : "";

    // Build regeneration feedback instruction
    const regenerationInstruction = regenerationFeedback
      ? `\n\nREGENERATION CONTEXT: The user received a previous reading and felt it didn't fit. Their feedback: "${regenerationFeedback}"\nYou MUST take this feedback seriously. Generate a substantially different reading that addresses what they flagged. Do NOT repeat the same Third Way or similar phrasing. Shift your angle, explore a different transit emphasis, and offer a fresh perspective that directly responds to their concern.`
      : "";

    // ─── Real Astrology API (astrology-api.io v3) ────────────────────────
    const ASTROLOGY_API_KEY = Deno.env.get("ASTROLOGY_API_KEY");
    let chartContext = "";

    if (ASTROLOGY_API_KEY && birthDate && birthDate !== "unknown" && birthLat != null && birthLng != null) {
      try {
        // Parse birth date (dd/mm/yyyy format)
        let bYear: number, bMonth: number, bDay: number;
        const dateParts = birthDate.split("/");
        if (dateParts.length === 3) {
          bDay = parseInt(dateParts[0], 10);
          bMonth = parseInt(dateParts[1], 10);
          bYear = parseInt(dateParts[2], 10);
        } else {
          const d = new Date(birthDate);
          bDay = d.getDate(); bMonth = d.getMonth() + 1; bYear = d.getFullYear();
        }

        let bHour = 12, bMinute = 0;
        if (birthTime && birthTime !== "unknown") {
          const tp = birthTime.split(":");
          bHour = parseInt(tp[0], 10); bMinute = parseInt(tp[1], 10);
        }

        const BASE_URL = "https://api.astrology-api.io/api/v3";
        const apiHeaders = {
          "Authorization": `Bearer ${ASTROLOGY_API_KEY}`,
          "Content-Type": "application/json",
        };

        // astrology-api.io v3 wraps birth data in subject.birth_data
        const birthData = {
          year: bYear, month: bMonth, day: bDay,
          hour: bHour, minute: bMinute, second: 0,
          latitude: parseFloat(String(birthLat)),
          longitude: parseFloat(String(birthLng)),
          timezone: birthTimezone || "UTC",
        };

        const now = new Date();
        // Transit uses transit_time.datetime with year/month/day/hour + lat/lng/timezone
        const transitDateTime = {
          year: now.getUTCFullYear(),
          month: now.getUTCMonth() + 1,
          day: now.getUTCDate(),
          hour: now.getUTCHours(),
          minute: now.getUTCMinutes(),
          latitude: parseFloat(String(birthLat)),
          longitude: parseFloat(String(birthLng)),
          timezone: "UTC",
        };

        const apiController = new AbortController();
        const apiTimeout = setTimeout(() => apiController.abort(), 8000);

        // Call natal chart + transits + Human Design in parallel
        const [natalRes, transitRes, hdRes] = await Promise.allSettled([
          fetch(`${BASE_URL}/charts/natal`, {
            method: "POST", headers: apiHeaders,
            body: JSON.stringify({ subject: { name: "user", birth_data: birthData } }),
            signal: apiController.signal,
          }),
          fetch(`${BASE_URL}/charts/transit`, {
            method: "POST", headers: apiHeaders,
            body: JSON.stringify({
              subject: { name: "user", birth_data: birthData },
              transit_time: { datetime: transitDateTime },
            }),
            signal: apiController.signal,
          }),
          fetch(`${BASE_URL}/human-design/bodygraph`, {
            method: "POST", headers: apiHeaders,
            body: JSON.stringify({ subject: { name: "user", birth_data: birthData } }),
            signal: apiController.signal,
          }),
        ]);

        clearTimeout(apiTimeout);

        let natalData: any = null, transitData: any = null, hdData: any = null;

        if (natalRes.status === "fulfilled" && natalRes.value.ok) {
          natalData = await natalRes.value.json();
        } else if (natalRes.status === "fulfilled") {
          console.warn("natal-chart API error:", natalRes.value.status, await natalRes.value.text());
        }
        if (transitRes.status === "fulfilled" && transitRes.value.ok) {
          transitData = await transitRes.value.json();
        } else if (transitRes.status === "fulfilled") {
          console.warn("transit API error:", transitRes.value.status, await transitRes.value.text());
        }
        if (hdRes.status === "fulfilled" && hdRes.value.ok) {
          hdData = await hdRes.value.json();
        } else if (hdRes.status === "fulfilled") {
          console.warn("human-design API error:", hdRes.value.status, await hdRes.value.text());
        }

        // ── Response shape: natal uses subject_data.<planet_name> objects ──
        // e.g. subject_data.sun = { name, sign, position, abs_pos, house, retrograde }
        if (natalData?.subject_data) {
          const sd = natalData.subject_data;
          const PLANET_KEYS = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","mean_node","chiron"];
          const natalLines = PLANET_KEYS
            .filter(k => sd[k])
            .map(k => {
              const p = sd[k];
              const retro = p.retrograde ? " [RETROGRADE]" : "";
              const house = p.house ? ` (${p.house.replace("_House","")} house)` : "";
              return `${p.name}: ${p.position?.toFixed(1)}° ${p.sign}${house}${retro}`;
            }).join("\n");

          const asc = sd.first_house;
          const mc = sd.tenth_house;
          const ascLine = asc ? `Ascendant: ${asc.position?.toFixed(1)}° ${asc.sign}` : "";
          const mcLine = mc ? `Midheaven: ${mc.position?.toFixed(1)}° ${mc.sign}` : "";

          // ── Transit: chart_data.planetary_positions (name ends in _transit) + aspects ──
          let transitLines = "";
          let aspectLines = "";
          if (transitData?.chart_data) {
            const positions: any[] = transitData.chart_data.planetary_positions || [];
            const transitPlanets = positions
              .filter((p: any) => p.name?.endsWith("_transit"))
              .map((p: any) => {
                const retro = p.is_retrograde ? " [R]" : "";
                return `${p.name.replace("_transit","")}: ${p.degree?.toFixed(1)}° ${p.sign}${retro}`;
              });
            transitLines = transitPlanets.join("\n");

            const aspects: any[] = (transitData.chart_data.aspects || []).slice(0, 10);
            aspectLines = aspects.map((a: any) =>
              `${a.point1.replace("_transit"," transit")} ${a.aspect_type} ${a.point2.replace("_natal"," natal")} (orb ${a.orb?.toFixed(1)}°, ${a.aspect_direction})`
            ).join("\n");
          }

          // ── Human Design: data.bodygraph ──
          let hdContext = "";
          if (hdData?.data?.bodygraph) {
            const bg = hdData.data.bodygraph;
            const pgates = (bg.personality_gates || []).slice(0, 6).map((g: any) => `${g.gate}.${g.line}`).join(", ");
            const dgates = (bg.design_gates || []).slice(0, 6).map((g: any) => `${g.gate}.${g.line}`).join(", ");
            hdContext = `

HUMAN DESIGN (from Swiss Ephemeris):
Type: ${bg.type}
Profile: ${bg.profile}
Authority: ${bg.authority}
Definition: ${bg.definition}
Incarnation Cross: ${bg.incarnation_cross || ""}
Personality gates: ${pgates}
Design gates: ${dgates}`;
          }

          chartContext = `

REAL CALCULATED CHART DATA (Swiss Ephemeris — use these exact values, do not guess or approximate):

NATAL PLANETS:
${natalLines}
${ascLine}
${mcLine}${hdContext}

TODAY'S TRANSITS (current sky, ${now.toISOString().slice(0,10)}):
${transitLines}

${aspectLines ? `KEY TRANSIT ASPECTS TO NATAL CHART:\n${aspectLines}` : ""}

IMPORTANT: Reference these EXACT planetary positions, signs, houses, and aspects in your astrology_reading. Name specific planets with their signs and relevant aspects. Do NOT fabricate or approximate any chart data — use only the values above.`;
        }
      } catch (chartError: any) {
        console.warn("Astrology API call failed, proceeding without chart data:", chartError.message);
        // Graceful fallback — reading continues without real chart data
      }
    }

    const userMessage = `Domain: ${domain}
Question: ${question}
Mode: ${mode || "Both"}
Birth date: ${birthDate || "unknown"}
Birth place: ${birthPlace || "unknown"}
Today's date: ${today}
Birth time: ${birthTime || "unknown"}${calculatorContext}${chartContext}${langInstruction}${everythingInstruction}${regenerationInstruction}${memoryContext}`;

    // Use AbortController for 12s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let fallbackReason: string | null = null;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "openai/gpt-5",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "deliver_reading",
                description: "Deliver the Aethel Mirror reading",
                parameters: {
                  type: "object",
                  properties: {
                    astrology_reading: { type: "string", description: "3-4 sentences of specific transits" },
                    design_insights: {
                      type: "array",
                      items: { type: "string" },
                      description: "Array of 3 insight strings starting with em-dash",
                    },
                    third_way: { type: "string", description: "1-3 sentences, specific actionable recommendation" },
                    journal_prompt: { type: "string", description: "One reflective question" },
                    confidence_level: { type: "string", enum: ["low", "medium", "high"] },
                  },
                  required: ["astrology_reading", "design_insights", "third_way", "journal_prompt", "confidence_level"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "deliver_reading" } },
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        fallbackReason = "api_error";
      }

      if (!fallbackReason) {
        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

        let reading;
        if (toolCall?.function?.arguments) {
          reading = JSON.parse(toolCall.function.arguments);
        } else {
          const content = data.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            reading = JSON.parse(jsonMatch[0]);
          } else {
            fallbackReason = "api_error";
          }
        }

        if (reading) {
          return new Response(JSON.stringify({ ...reading, is_fallback: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        fallbackReason = "timeout";
      } else {
        fallbackReason = "api_error";
      }
      console.error("AI call failed, using fallback:", err);
    }

    // Serve fallback
    const fallback = selectFallback(domain, mode || "Both");
    const { domain: _d, mode: _m, ...reading } = fallback;
    return new Response(JSON.stringify({ ...reading, is_fallback: true, fallback_reason: fallbackReason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("generate-reading error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
