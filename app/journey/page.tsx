"use client";

import { useState, useEffect } from "react";
import { journeyData, Year } from "@/data/journey";
import { createClient, CourseNote } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const yearColors = [
  "border-blue-500 bg-blue-500",
  "border-purple-500 bg-purple-500",
  "border-emerald-500 bg-emerald-500",
  "border-amber-500 bg-amber-500",
];

const topicColors: Record<string, string> = {
  "Programming Fundamentals": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Data Structures & Algorithms": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Mathematics & Formal Foundations": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "Computer Architecture": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Software Design & Architecture": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Software Construction & Clean Code": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Networking & Internet Fundamentals": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Databases & Data Management": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "Operating Systems & Concurrency": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  "Security & Privacy": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Testing & Verification": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "AI / ML": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "Cloud & Distributed Systems": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "Front-end & Web Dev": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Game Development": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Graphics & Interactive Systems": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
};

function getTopicColor(topic: string): string {
  return topicColors[topic] || "bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300";
}

export default function JourneyPage() {
  const { user } = useAuth();
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [filterTopic, setFilterTopic] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("course_notes").select("*");
    if (data) {
      const noteMap: Record<string, string> = {};
      data.forEach((n: CourseNote) => { noteMap[n.course_code] = n.notes; });
      setNotes(noteMap);
    }
  };

  const saveNote = async (courseCode: string) => {
    const supabase = createClient();
    const existing = notes[courseCode];
    if (existing !== undefined) {
      await supabase.from("course_notes").update({ notes: noteText }).eq("course_code", courseCode);
    } else {
      await supabase.from("course_notes").insert([{ course_code: courseCode, notes: noteText }]);
    }
    setNotes({ ...notes, [courseCode]: noteText });
    setEditingNote(null);
  };

  const toggleYear = (year: number) => {
    const next = new Set(expandedYears);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    setExpandedYears(next);
  };

  // Collect all topics for filter
  const allTopics = new Set<string>();
  journeyData.forEach((y) => y.terms.forEach((t) => t.courses.forEach((c) => c.topics.forEach((tp) => allTopics.add(tp)))));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          My Software Engineering Journey
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          4 years at Western University — every course, every topic, organized as a timeline.
        </p>
      </div>

      {/* Topic filter */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTopic(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !filterTopic
                ? "bg-accent-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            All Topics
          </button>
          {Array.from(allTopics).sort().map((topic) => (
            <button
              key={topic}
              onClick={() => setFilterTopic(filterTopic === topic ? null : topic)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterTopic === topic
                  ? "bg-accent-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" />

        {journeyData.map((yearData, yi) => {
          // Filter courses
          const filteredTerms = yearData.terms.map((t) => ({
            ...t,
            courses: filterTopic
              ? t.courses.filter((c) => c.topics.includes(filterTopic))
              : t.courses,
          })).filter((t) => t.courses.length > 0);

          if (filterTopic && filteredTerms.length === 0) return null;

          return (
            <div key={yearData.year} className="relative mb-10">
              {/* Year header dot */}
              <button
                onClick={() => toggleYear(yearData.year)}
                className="flex items-center gap-4 group mb-4"
              >
                <div className={`relative z-10 w-8 h-8 sm:w-12 sm:h-12 rounded-full ${yearColors[yi]} flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-lg`}>
                  {yearData.year}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                  {yearData.label}
                </h2>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expandedYears.has(yearData.year) ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {expandedYears.has(yearData.year) && (
                <div className="ml-12 sm:ml-16 space-y-6">
                  {filteredTerms.map((term) => (
                    <div key={term.name}>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                        {term.name}
                      </h3>
                      <div className="space-y-3">
                        {term.courses.map((course) => (
                          <div key={course.code} className="card p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                              <code className="text-xs font-mono text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20 px-2 py-1 rounded whitespace-nowrap self-start">
                                {course.code}
                              </code>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                  {course.name}
                                </h4>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {course.topics.map((topic) => (
                                    <span
                                      key={topic}
                                      onClick={() => setFilterTopic(filterTopic === topic ? null : topic)}
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${getTopicColor(topic)}`}
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                </div>

                                {/* Notes section */}
                                {notes[course.code] && editingNote !== course.code && (
                                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                                    {notes[course.code]}
                                  </p>
                                )}

                                {editingNote === course.code ? (
                                  <div className="mt-2 space-y-2">
                                    <textarea
                                      value={noteText}
                                      onChange={(e) => setNoteText(e.target.value)}
                                      className="textarea-field text-sm"
                                      rows={2}
                                      placeholder="Add notes about this course..."
                                    />
                                    <div className="flex gap-2">
                                      <button onClick={() => saveNote(course.code)} className="btn-primary text-xs px-3 py-1">Save</button>
                                      <button onClick={() => setEditingNote(null)} className="btn-secondary text-xs px-3 py-1">Cancel</button>
                                    </div>
                                  </div>
                                ) : user ? (
                                  <button
                                    onClick={() => { setEditingNote(course.code); setNoteText(notes[course.code] || ""); }}
                                    className="mt-2 text-xs text-accent-600 dark:text-accent-400 hover:underline"
                                  >
                                    {notes[course.code] ? "Edit note" : "+ Add note"}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
