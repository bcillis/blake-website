"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { journeyData } from "@/data/journey";
import { createClient, CourseNote } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { FadeUp } from "@/components/Motion";

const yearAccents = [
  "from-sky-500/30 to-sky-500/0 border-sky-500/40",
  "from-violet-500/30 to-violet-500/0 border-violet-500/40",
  "from-emerald-500/30 to-emerald-500/0 border-emerald-500/40",
  "from-amber-500/30 to-amber-500/0 border-amber-500/40",
];

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

    const filePath = `${user.id}/${courseCode}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("course-files")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("course-files").getPublicUrl(filePath);
    const fileUrl = urlData.publicUrl;

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
    const filePath = `${user?.id}/${courseCode}/${noteData.file_name}`;
    await supabase.storage.from("course-files").remove([filePath]);
    await supabase.from("course_notes").update({ file_url: null, file_name: null }).eq("course_code", courseCode);
    setNotes({ ...notes, [courseCode]: { ...noteData, file_url: null, file_name: null } });
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

  const allTopics = new Set<string>();
  journeyData.forEach((y) => y.terms.forEach((t) => t.courses.forEach((c) => c.topics.forEach((tp) => allTopics.add(tp)))));

  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      <header className="pt-16 pb-10 max-w-2xl">
        <FadeUp>
          <span className="eyebrow mb-4">Western University · 2022–2026</span>
        </FadeUp>
        <FadeUp delay={0.05}>
          <h1 className="section-title mb-4">
            Software engineering, <span className="text-[var(--accent)] italic font-serif">four years</span>.
          </h1>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="lead">
            Every course, every topic, organized as a timeline.
            {user ? " Click any course to add notes, files, or a description." : ""}
          </p>
        </FadeUp>
      </header>

      <FadeUp delay={0.15}>
        <div className="mb-10">
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Filter by topic
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterTopic(null)}
              className={`chip chip-button ${!filterTopic ? "chip-active" : ""}`}
            >
              All
            </button>
            {Array.from(allTopics).sort().map((topic) => (
              <button
                key={topic}
                onClick={() => setFilterTopic(filterTopic === topic ? null : topic)}
                className={`chip chip-button ${filterTopic === topic ? "chip-active" : ""}`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </FadeUp>

      <div className="space-y-4">
        {journeyData.map((yearData, yi) => {
          const filteredTerms = yearData.terms
            .map((t) => ({
              ...t,
              courses: filterTopic ? t.courses.filter((c) => c.topics.includes(filterTopic)) : t.courses,
            }))
            .filter((t) => t.courses.length > 0);

          if (filterTopic && filteredTerms.length === 0) return null;
          const isOpen = expandedYears.has(yearData.year);
          const accent = yearAccents[yi % yearAccents.length];

          return (
            <FadeUp key={yearData.year} delay={0.2 + yi * 0.05}>
              <section className="card !p-0 overflow-hidden">
                <button
                  onClick={() => toggleYear(yearData.year)}
                  className="w-full flex items-center gap-4 p-5 sm:p-6 text-left group"
                >
                  <span
                    className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br ${accent} font-serif text-lg text-[var(--text-primary)]`}
                  >
                    {yearData.year}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Year {yearData.year}
                    </div>
                    <h2 className="font-serif text-xl text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {yearData.label}
                    </h2>
                  </div>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-[var(--text-secondary)]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="year-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 sm:px-6 pb-6 space-y-6 border-t border-[var(--border)] pt-5">
                        {filteredTerms.map((term) => (
                          <div key={term.name}>
                            <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-3">
                              {term.name}
                            </h3>
                            <div className="space-y-2">
                              {term.courses.map((course) => {
                                const noteData = notes[course.code];
                                const isExpanded = expandedCourse === course.code;
                                const hasContent = noteData && (noteData.description || noteData.notes || noteData.file_url);

                                return (
                                  <div
                                    key={course.code}
                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 overflow-hidden transition-colors hover:border-[var(--accent)]/50"
                                  >
                                    <button
                                      onClick={() => toggleCourse(course.code)}
                                      className="w-full p-4 text-left"
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                        <code className="font-mono text-xs text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-1 rounded-md whitespace-nowrap self-start">
                                          {course.code}
                                        </code>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                              {course.name}
                                            </h4>
                                            {hasContent && (
                                              <span
                                                className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                                                title="Has notes/files"
                                              />
                                            )}
                                            <motion.svg
                                              animate={{ rotate: isExpanded ? 180 : 0 }}
                                              transition={{ duration: 0.2 }}
                                              className="w-4 h-4 ml-auto text-[var(--text-muted)]"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                                            </motion.svg>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5 mt-2">
                                            {course.topics.map((topic) => (
                                              <span
                                                key={topic}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setFilterTopic(filterTopic === topic ? null : topic);
                                                }}
                                                className={`chip chip-button text-[0.68rem] ${filterTopic === topic ? "chip-active" : ""}`}
                                              >
                                                {topic}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </button>

                                    <AnimatePresence initial={false}>
                                      {isExpanded && (
                                        <motion.div
                                          key="course-body"
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.25 }}
                                          className="overflow-hidden border-t border-[var(--border)]"
                                        >
                                          <div className="p-4 space-y-4">
                                            {editingNote === course.code ? (
                                              <div className="space-y-3">
                                                <div>
                                                  <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                                    Description
                                                  </label>
                                                  <textarea
                                                    value={descriptionText}
                                                    onChange={(e) => setDescriptionText(e.target.value)}
                                                    className="textarea-field text-sm"
                                                    rows={4}
                                                    placeholder="What did this course cover? Key takeaways?"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                                    Quick notes
                                                  </label>
                                                  <textarea
                                                    value={noteText}
                                                    onChange={(e) => setNoteText(e.target.value)}
                                                    className="textarea-field text-sm min-h-[80px]"
                                                    rows={2}
                                                    placeholder="Tips, reminders, links..."
                                                  />
                                                </div>
                                                <div className="flex gap-2">
                                                  <button onClick={() => saveNote(course.code)} className="btn-primary text-sm">Save</button>
                                                  <button onClick={() => setEditingNote(null)} className="btn-secondary text-sm">Cancel</button>
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                {noteData?.description ? (
                                                  <div>
                                                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Description</div>
                                                    <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                                                      {noteData.description}
                                                    </p>
                                                  </div>
                                                ) : (
                                                  <p className="text-sm text-[var(--text-muted)] italic">No description yet.</p>
                                                )}

                                                {noteData?.notes && (
                                                  <div>
                                                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Notes</div>
                                                    <p className="text-sm text-[var(--text-secondary)] italic whitespace-pre-wrap">
                                                      {noteData.notes}
                                                    </p>
                                                  </div>
                                                )}

                                                {noteData?.file_url && (
                                                  <div>
                                                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Attached file</div>
                                                    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                                                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)] text-xs">
                                                        ⤓
                                                      </span>
                                                      <a
                                                        href={noteData.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 text-sm text-[var(--accent)] hover:underline truncate"
                                                      >
                                                        {noteData.file_name || "View file"}
                                                      </a>
                                                      {user && (
                                                        <button
                                                          onClick={() => removeFile(course.code)}
                                                          className="btn-ghost text-xs"
                                                        >
                                                          Remove
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                                {user && (
                                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    <button
                                                      onClick={() => {
                                                        setEditingNote(course.code);
                                                        setDescriptionText(noteData?.description || "");
                                                        setNoteText(noteData?.notes || "");
                                                      }}
                                                      className="btn-ghost text-xs"
                                                    >
                                                      {noteData?.description || noteData?.notes ? "Edit notes" : "Add notes"}
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
                                                      className="btn-ghost text-xs"
                                                    >
                                                      {uploading ? "Uploading..." : noteData?.file_url ? "Replace file" : "Upload file"}
                                                    </button>
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </FadeUp>
          );
        })}
      </div>
    </div>
  );
}
