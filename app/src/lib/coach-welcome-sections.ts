// Default "welcome pages" a new coach reads during the sign-up wizard.
// Seeded into coach_welcome_sections on first edit; Rhett edits them in the CRM
// (Coach Academy → Welcome Pack → "Sign-up wizard pages"). The public /join
// wizard reads whatever is in the DB, falling back to these.

export type WelcomeSection = { title: string; body: string }

export const DEFAULT_WELCOME_SECTIONS: WelcomeSection[] = [
  { title: 'Welcome from Rhett', body: `Welcome to BigStar Circus — I'm Rhett, the founder. If you're reading this, it's because we think you might be one of us.\n\nBigStar didn't start as a business. It started because I believe every child deserves to feel confident, capable and celebrated. Circus is simply the most magical way I've found to do that.\n\nOur mission: to build confident, creative and capable young people through circus.\nOur values: Children first · Confidence always · Warmth · Growth · Safety · Team.` },
  { title: 'What makes a BigStar coach different', body: `Anyone can teach a cartwheel. A BigStar coach teaches a child to believe they can do it — then cheers like it's the Olympics when they land it.\n\nChildren first. Circus second. Confidence always.\n\nWe hire for heart. Skills we can teach. The way you make a nervous 5-year-old feel brave — that's the magic, and that's you.` },
  { title: 'Our expectations', body: `★ Always arrive early\n★ Smile — every single class\n★ Know every child's name\n★ Talk to the parents\n★ Wear your uniform with pride\n★ Be professional & positive\n★ Keep learning\n★ Keep every child safe\n★ Represent the brand` },
  { title: 'Our culture', body: `Four things we never compromise on:\n\n🚫 No egos — the kids are the stars, not us.\n🤝 Support your teammates. Always.\n🎉 Celebrate wins — theirs and each other's.\n💛 Leave every child better than you found them.` },
  { title: 'How we teach', body: `We teach confidence, using circus as the tool. That means:\n\n⭐ We celebrate effort, not just achievement.\n🌱 We coach a growth mindset — "you can't do it yet."\n💬 We use encouragement and positive reinforcement first, always.\n🎯 Every child leaves each class having felt one clear moment of success.` },
  { title: 'The BigStar child', body: `Every child who walks out of a BigStar class should leave:\n\n• Feeling confident\n• Feeling included\n• Feeling successful\n• Feeling safe\n• Wanting to come back` },
  { title: 'The parent experience', body: `Parents trust us with the most precious thing in their world. We earn that trust every class:\n\n👋 Greet every parent by name where you can.\n💬 Answer questions warmly and honestly.\n📣 Share a win about their child at pickup.\n🤝 Handle any complaint calmly — listen, apologise, fix, tell Rhett.` },
  { title: 'Your development & pay', body: `You're not taking a job — you're stepping onto a pathway:\n\nShadow $30–31 → Coach $33 → Lead Coach $37 → Senior/Head Coach $40+/hr\n\nYou're engaged as a contractor, paid every fortnight, with super paid every fortnight on top. Every new circus discipline you master earns you more — and as we open new locations, today's coaches become tomorrow's leaders.` },
  { title: 'Professional standards', body: `✔ Blue Card (Working with Children) — always current\n✔ Child protection is everyone's job\n✔ Confidentiality — what happens here stays here\n✔ Phones away during class\n✔ No posting children on social media\n✔ Wear the uniform, look the part\n✔ Safety checks before every session\n✔ Report every incident, no matter how small` },
]
