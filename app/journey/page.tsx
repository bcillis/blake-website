"use client";

import { useState, useEffect, useRef } from "react";
import { journeyData } from "@/data/journey";
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

interface NoteData {
  notes: string;
  description: string;
  file_url: string | null;
  file_name: string | null;
}

export default function JourneyPage() {
  const { user } = useAuth();
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [notes, setNotes] = useState<Record<string, NoteData>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("course_notes").select("*");
    if (data) {
      const noteMap: Record<string, NoteData> = {};
      data.forEach((n: CourseNote) => {
        noteMap[n.course_code] = {
          notes: n.notes,
          description: n.description || "",
          file_url: n.file_url,
          file_name: n.file_name,
        };
      });
      setNotes(noteMap);
    }
  };

  const saveNote = async (courseCode: string) => {
    if (!user) return;
    const supabase = createClient();
    const existing = notes[courseCode];
    if (existing !== undefined) {
      await supabase.from("course_notes").update({
        notes: noteText,
        description: descriptionText,
      }).eq("course_code", courseCode);
    } else {
      await supabase.from("course_notes").insert([{
        course_code: courseCode,
        notes: noteText,
        description: descriptionText,
        user_id: user.id,
      }]);
    }
    setNotes({
      ...notes,
      [courseCode]: {
        ...notes[courseCode],
        notes: noteText,
        description: descriptionText,
        file_url: notes[courseCode]?.file_url || null,
        file_name: notes[courseCode]?.file_name || null,
      },
    });
    setEditingNote(null);
  };

  const handleFileUpload = async (courseCode: string, file: File) => {
    if (!user) return;
    setUploading(true);
    const supabase = createClient();

    // Upload file to Supabase Storage
    const filePath = `${user.id}/${courseCode}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("course-files")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("course-files")
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;

    // Update or insert the course note with file info
    const existing = notes[courseCode];
    if (existing !== undefined) {
      await supabase.from("course_notes").update({
        file_url: fileUrl,
        file_name: file.name,
      }).eq("course_code", courseCode);
    } else {
      await supabase.from("course_notes").insert([{
        course_code: courseCode,
        notes: "",
        description: "",
        file_url: fileUrl,
        file_name: file.name,
        user_id: user.id,
      }]);
    }

    setNotes({
      ...notes,
      [courseCode]: {
        notes: existing?.notes || "",
        description: existing?.description || "",
        file_url: fileUrl,
        file_name: file.name,
      },
    });
    setUploading(false);
  };

  const removeFile = async (courseCode: string) => {
    if (!confirm("Remove this file?")) return;
    const supabase = createClient();
    const noteData = notes[courseCode];
    if (!noteData?.file_url) return;

    // Remove from storage
    const filePath = `${user?.id}/${courseCode}/${noteData.file_name}`;
    await supabase.storage.from("course-files").remove([filePath]);

    // Update the record
    await supabase.from("course_notes").update({
      file_url: null,
      file_name: null,
    }).eq("course_code", courseCode);

    setNotes({
      ...notes,
      [courseCode]: { ...noteData, file_url: null, file_name: null },
    });
  };

  const toggleYear = (year: number) => {
    const next = new Set(expandedYears);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    setExpandedYears(next);
  };

  const toggleCourse = (code: string) => {
    setExpandedCourse(expandedCourse === code ? null : code);
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
          {user ? " Click any course to expand details, add notes, or upload files." : ""}
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
          const filteredTerms = yearData.terms.map((t) => ({
            ...t,
            courses: filterTopic
              ? t.courses.filter((c) => c.topics.includes(filterTopic))
              : t.courses,
          })).filter((t) => t.courses.length > 0);

          if (filterTopic && filteredTerms.length === 0) return null;

          return (
            <div key={yearData.year} className="relative mb-10">
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
                        {term.courses.map((course) => {
                          const noteData = notes[course.code];
                          const isExpanded = expandedCourse === course.code;
                          const hasContent = noteData && (noteData.description || noteData.notes || noteData.file_url);

                          return (
                            <div key={course.code} className="card overflow-hidden">
                              {/* Course header - clickable to expand */}
                              <button
                                onClick={() => toggleCourse(course.code)}
                                className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                                  <code className="text-xs font-mono text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20 px-2 py-1 rounded whitespace-nowrap self-start">
                                    {course.code}
                                  </code>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                        {course.name}
                                      </h4>
                                      {hasContent && (
                                        <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0" title="Has notes/files" />
                                      )}
                                      <svg
                                        className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                      </svg>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {course.topics.map((topic) => (
                                        <span
                                          key={topic}
                                          onClick={(e) => { e.stopPropagation(); setFilterTopic(filterTopic === topic ? null : topic); }}
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${getTopicColor(topic)}`}
                                        >
                                          {topic}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </button>

                              {/* Expanded content */}
                              {isExpanded && (
                                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                                  {/* Description section */}
                                  {editingNote === course.code ? (
                                    <div className="mt-4 space-y-3">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                        <textarea
                                          value={descriptionText}
                                          onChange={(e) => setDescriptionText(e.target.value)}
                                          className="textarea-field text-sm"
                                          rows={4}
                                          placeholder="Describe what this course covered, key takeaways, etc."
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quick Notes</label>
                                        <textarea
                                          value={noteText}
                                          onChange={(e) => setNoteText(e.target.value)}
                                          className="textarea-field text-sm"
                                          rows={2}
                                          placeholder="Short notes, tips, or reminders..."
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => saveNote(course.code)} className="btn-primary text-xs px-3 py-1.5">Save</button>
                                        <button onClick={() => setEditingNote(null)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-4 space-y-3">
                                      {/* Display description */}
                                      {noteData?.description ? (
                                        <div>
                                          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Description</h5>
                                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {noteData.description}
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-400 dark:text-gray-600 italic">No description added yet.</p>
                                      )}

                                      {/* Display notes */}
                                      {noteData?.notes && (
                                        <div>
                                          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Notes</h5>
                                          <p className="text-sm text-gray-600 dark:text-gray-400 italic whitespace-pre-wrap">
                                            {noteData.notes}
                                          </p>
                                        </div>
                                      )}

                                      {/* Display attached file */}
                                      {noteData?.file_url && (
                                        <div>
                                          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Attached File</h5>
                                          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                            </svg>
                                            <div className="flex-1 min-w-0">
                                              <a
                                                href={noteData.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline truncate block"
                                              >
                                                {noteData.file_name || "View file"}
                                              </a>
                                              <p className="text-xs text-gray-400">Click to open / download</p>
                                            </div>
                                            {user && (
                                              <button
                                                onClick={() => removeFile(course.code)}
                                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Remove file"
                                              >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Edit / Upload buttons (auth only) */}
                                      {user && (
                                        <div className="flex flex-wrap items-center gap-2 pt-2">
                                          <button
                                            onClick={() => {
                                              setEditingNote(course.code);
                                              setDescriptionText(noteData?.description || "");
                                              setNoteText(noteData?.notes || "");
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                            </svg>
                                            {noteData?.description || noteData?.notes ? "Edit description / notes" : "Add description / notes"}
                                          </button>

                                          <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleFileUpload(course.code, file);
                                              e.target.value = "";
                                            }}
                                          />
                                          <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                            </svg>
                                            {uploading ? "Uploading..." : noteData?.file_url ? "Replace file" : "Upload PDF / file"}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
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
