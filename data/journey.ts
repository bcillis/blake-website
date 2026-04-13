export interface Course {
  code: string;
  name: string;
  topics: string[];
}

export interface Term {
  name: string;
  courses: Course[];
}

export interface Year {
  year: number;
  label: string;
  terms: Term[];
}

export const journeyData: Year[] = [
  {
    year: 1,
    label: "First Year — Foundations",
    terms: [
      {
        name: "Full Year / Terms A & B",
        courses: [
          { code: "ES 1036A/B", name: "Programming Fundamentals for Engineers", topics: ["Programming Fundamentals"] },
          { code: "ES 1050", name: "Foundations of Engineering Practice", topics: ["Professional Practice", "Communication & Teamwork"] },
          { code: "NMM 1412A", name: "Calculus for Engineers I", topics: ["Mathematics & Formal Foundations"] },
          { code: "NMM 1414B", name: "Calculus for Engineers II", topics: ["Mathematics & Formal Foundations"] },
          { code: "NMM 1411A/B", name: "Linear Algebra with Numerical Analysis for Engineers", topics: ["Mathematics & Formal Foundations"] },
          { code: "Phys 1401A/B", name: "Physics for Engineering Students I", topics: ["Science Foundations"] },
          { code: "Phys 1402A/B", name: "Physics for Engineering Students II", topics: ["Science Foundations"] },
          { code: "Chem 1302A/B", name: "Chemistry for Engineers", topics: ["Science Foundations"] },
          { code: "ES 1021A/B", name: "Properties of Materials in Engineering", topics: ["Engineering Foundations"] },
          { code: "ES 1022Y", name: "Engineering Statics", topics: ["Engineering Foundations"] },
          { code: "BUS 1299E", name: "Business for Engineers", topics: ["Economics & Tradeoff Analysis", "Professional Practice"] },
        ],
      },
    ],
  },
  {
    year: 2,
    label: "Second Year — Core CS & Software Fundamentals",
    terms: [
      {
        name: "Term A",
        courses: [
          { code: "SE 2205a", name: "Algorithms and Data Structures", topics: ["Data Structures & Algorithms", "Problem Solving"] },
          { code: "SE 2202a", name: "Scripting Programming Language Fundamentals", topics: ["Programming Languages & Paradigms"] },
          { code: "ECE 2277a", name: "Digital Logic Systems", topics: ["Computer Architecture"] },
          { code: "Math 2151a", name: "Discrete Structures for Engineering", topics: ["Mathematics & Formal Foundations"] },
          { code: "SS 2141a", name: "Applied Probability and Statistics", topics: ["Mathematics & Formal Foundations", "Measurement & Empirical Work"] },
          { code: "NMM 2270a", name: "Applied Mathematics for Engineering II", topics: ["Mathematics & Formal Foundations"] },
        ],
      },
      {
        name: "Term B",
        courses: [
          { code: "SE 2203b", name: "Software Design", topics: ["Software Design & Architecture"] },
          { code: "SE 2250b", name: "Software Construction", topics: ["Software Construction & Clean Code"] },
          { code: "NMM 2276b", name: "Applied Mathematics for Elec & Mech Eng III", topics: ["Mathematics & Formal Foundations"] },
          { code: "Writing 2130f/g", name: "Building Better (Communication) Bridges", topics: ["Communication & Teamwork"] },
        ],
      },
    ],
  },
  {
    year: 3,
    label: "Third Year — Systems, Networking & Engineering Practice",
    terms: [
      {
        name: "Term A",
        courses: [
          { code: "SE 3316a", name: "Web Technologies", topics: ["Front-end & Web Dev", "Back-end & API Dev"] },
          { code: "SE 3309a", name: "Database Management Systems", topics: ["Databases & Data Management"] },
          { code: "SE 3351a", name: "Software Project and Process Management", topics: ["Software Process & Lifecycle", "Agile & Scrum"] },
          { code: "SE 3352a", name: "Software Requirements & Analysis", topics: ["Requirements Engineering"] },
          { code: "SE 3310a", name: "Theoretical Foundations of Software Engineering", topics: ["Mathematics & Formal Foundations", "Problem Solving"] },
          { code: "ECE 4436a", name: "Networking: Principles, Protocols, and Architecture", topics: ["Networking & Internet Fundamentals"] },
        ],
      },
      {
        name: "Term B",
        courses: [
          { code: "SE 3313b", name: "Operating Systems for Software Engineering", topics: ["Operating Systems & Concurrency"] },
          { code: "SE 3353b", name: "Human-Computer Interaction", topics: ["HCI, UX & Accessibility"] },
          { code: "SE 3350b", name: "Software Engineering Design I", topics: ["Software Design & Architecture", "Capstone"] },
          { code: "SE 3314b", name: "Computer Networks Applications", topics: ["Networking & Internet Fundamentals", "Cloud & Distributed Systems"] },
          { code: "ECE 3375b", name: "Microprocessors and Microcomputers", topics: ["Computer Architecture", "Embedded / IoT"] },
          { code: "Physics 2300", name: "Quantum Computation and Information", topics: ["Quantum Computing"] },
        ],
      },
    ],
  },
  {
    year: 4,
    label: "Fourth Year — Specialization & Capstone",
    terms: [
      {
        name: "Term A",
        courses: [
          { code: "SE 4450", name: "Software Engineering Design II (Capstone)", topics: ["Capstone / Project Integration"] },
          { code: "SE 4452a", name: "Software Testing and Maintenance", topics: ["Testing & Verification"] },
          { code: "SE 4472a", name: "Information Security", topics: ["Security & Privacy"] },
          { code: "DS 3000", name: "Intro to Machine Learning", topics: ["AI / ML"] },
          { code: "CS 3346", name: "Artificial Intelligence I", topics: ["AI / ML"] },
        ],
      },
      {
        name: "Term B",
        courses: [
          { code: "SE 4450", name: "Software Engineering Design II (Capstone cont.)", topics: ["Capstone / Project Integration"] },
          { code: "SE 4455b", name: "Cloud Computing: Concepts, Technologies and Applications", topics: ["Cloud & Distributed Systems", "DevOps"] },
          { code: "ELI 4110g", name: "Engineering Ethics, Sustainable Development and the Law", topics: ["Professional Practice & Ethics"] },
          { code: "CS 3388", name: "Computer Graphics I", topics: ["Graphics & Interactive Systems"] },
          { code: "CS 4483", name: "Game Design", topics: ["Game Development"] },
        ],
      },
    ],
  },
];

// All unique topic tags used across courses
export const allTopics = [
  "Programming Fundamentals",
  "Data Structures & Algorithms",
  "Problem Solving",
  "Programming Languages & Paradigms",
  "Mathematics & Formal Foundations",
  "Computer Architecture",
  "Operating Systems & Concurrency",
  "Networking & Internet Fundamentals",
  "Databases & Data Management",
  "Requirements Engineering",
  "Software Design & Architecture",
  "Software Construction & Clean Code",
  "Software Process & Lifecycle",
  "Agile & Scrum",
  "Testing & Verification",
  "Security & Privacy",
  "HCI, UX & Accessibility",
  "Professional Practice & Ethics",
  "Professional Practice",
  "Communication & Teamwork",
  "Measurement & Empirical Work",
  "Economics & Tradeoff Analysis",
  "Front-end & Web Dev",
  "Back-end & API Dev",
  "Cloud & Distributed Systems",
  "DevOps",
  "AI / ML",
  "Graphics & Interactive Systems",
  "Game Development",
  "Embedded / IoT",
  "Quantum Computing",
  "Capstone / Project Integration",
  "Science Foundations",
  "Engineering Foundations",
];
