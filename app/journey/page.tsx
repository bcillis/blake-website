"use client";

import { useState, useEffect, useMemo } from "react";
import { journeyData } from "@/data/journey";
import { createClient, CourseNote } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface NoteData {
  notes: string;
  description: string;
  file_url: string | null;
  file_name: string | null;
}

/** Chevron that rotates with the disclosure it labels. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`w-4 h-4 shrink-0 text-[var(--ink-3)] transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function JourneyPage() {
  const { user } = useAuth();
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Record<string, NoteData>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
    const { error } =
      existing !== undefined
        ? await supabase
            .from("course_notes")
            .update({ notes: noteText, description: descriptionText })
            .eq("course_code", courseCode)
        : await supabase.from("course_notes").insert([
            {
              course_code: courseCode,
              notes: noteText,
              description: descriptionText,
              user_id: user.id,
            },
          ]);

    if (error) {
      setActionError(`Couldn't save notes for ${courseCode}: ${error.message}`);
      return;
    }

    setActionError(null);
    setNotes({
      ...notes,
      [courseCode]: {
        notes: noteText,
        description: descriptionText,
        file_url: notes[courseCode]?.file_url ?? null,
        file_name: notes[courseCode]?.file_name ?? null,
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
      setActionError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("course-files").getPublicUrl(filePath);
    const fileUrl = urlData.publicUrl;

    const existing = notes[courseCode];
    const { error } =
      existing !== undefined
        ? await supabase
            .from("course_notes")
            .update({ file_url: fileUrl, file_name: file.name })
            .eq("course_code", courseCode)
        : await supabase.from("course_notes").insert([
            {
              course_code: courseCode,
              notes: "",
              description: "",
              file_url: fileUrl,
              file_name: file.name,
              user_id: user.id,
            },
          ]);

    if (error) {
      setActionError(`Couldn't attach the file: ${error.message}`);
      setUploading(false);
      return;
    }

    setActionError(null);
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
    const noteData = notes[courseCode];
    if (!noteData?.file_url) return;
    const supabase = createClient();
    const filePath = `${user?.id}/${courseCode}/${noteData.file_name}`;
    await supabase.storage.from("course-files").remove([filePath]);
    const { error } = await supabase
      .from("course_notes")
      .update({ file_url: null, file_name: null })
      .eq("course_code", courseCode);
    if (error) {
      setActionError(`Couldn't remove the file: ${error.message}`);
      return;
    }
    setActionError(null);
    setNotes({ ...notes, [courseCode]: { ...noteData, file_url: null, file_name: null } });
  };

  const toggleYear = (year: number) => {
    const next = new Set(expandedYears);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    setExpandedYears(next);
  };

  const toggleCourse = (code: string) =>
    setExpandedCourse(expandedCourse === code ? null : code);

  const sortedTopics = useMemo(() => {
    const all = new Set<string>();
    journeyData.forEach((y) =>
      y.terms.forEach((t) => t.courses.forEach((c) => c.topics.forEach((tp) => all.add(tp))))
    );
    return Array.from(all).sort();
  }, []);

  const TOPIC_PREVIEW = 6;
  const visibleTopics = showAllTopics ? sortedTopics : sortedTopics.slice(0, TOPIC_PREVIEW);
  const hasMoreTopics = sortedTopics.length > TOPIC_PREVIEW;

  const courseCount = useMemo(
    () =>
      journeyData.reduce(
        (sum, y) => sum + y.terms.reduce((s, t) => s + t.courses.length, 0),
        0
      ),
    []
  );

  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      <header className="pt-16 pb-10">
        <p className="meta mb-5">Western University · 2022–2026</p>
        <h1 className="page-title mb-5">Journey.</h1>
        <p className="lead">
          Every course from four years of Software Engineering, in order.
          {user ? " Open a course to add a description, notes, or a file." : ""}
        </p>
      </header>

      {/* Topic filter */}
      <section aria-labelledby="filter-heading" className="pb-8">
        <h2 id="filter-heading" className="meta mb-3">
          Filter by topic
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterTopic(null)}
            aria-pressed={!filterTopic}
            className={`tag ${!filterTopic ? "tag-active" : ""}`}
          >
            All
          </button>
          {visibleTopics.map((topic) => (
            <button
              key={topic}
              onClick={() => setFilterTopic(filterTopic === topic ? null : topic)}
              aria-pressed={filterTopic === topic}
              className={`tag ${filterTopic === topic ? "tag-active" : ""}`}
            >
              {topic}
            </button>
          ))}
          {hasMoreTopics && (
            <button
              onClick={() => setShowAllTopics(!showAllTopics)}
              aria-expanded={showAllTopics}
              className="tag"
            >
              {showAllTopics ? "Show less" : `+${sortedTopics.length - TOPIC_PREVIEW} more`}
            </button>
          )}
        </div>
      </section>

      {actionError && (
        <div role="alert" className="alert mb-6">
          {actionError}
        </div>
      )}

      <p className="meta pb-3" aria-live="polite">
        {filterTopic ? `Filtered by ${filterTopic}` : `${courseCount} courses · 4 years`}
      </p>

      {/* Year ledger */}
      <div className="border-t border-[var(--rule-strong)]">
        {journeyData.map((yearData) => {
          const filteredTerms = yearData.terms
            .map((t) => ({
              ...t,
              courses: filterTopic
                ? t.courses.filter((c) => c.topics.includes(filterTopic))
                : t.courses,
            }))
            .filter((t) => t.courses.length > 0);

          if (filterTopic && filteredTerms.length === 0) return null;

          const isOpen = expandedYears.has(yearData.year);
          const yearCourses = filteredTerms.reduce((s, t) => s + t.courses.length, 0);

          return (
            <section key={yearData.year} className="border-b border-[var(--rule)]">
              <h2>
                <button
                  onClick={() => toggleYear(yearData.year)}
                  aria-expanded={isOpen}
                  aria-controls={`year-${yearData.year}`}
                  className="w-full flex items-baseline gap-5 py-5 text-left group"
                >
                  {/* Years are told apart by a large mono numeral, not by colour. */}
                  <span
                    aria-hidden="true"
                    className="font-mono text-3xl leading-none text-[var(--ink-3)] group-hover:text-[var(--accent)] transition-colors tabular-nums"
                  >
                    {String(yearData.year).padStart(2, "0")}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-serif text-xl leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                      {yearData.label}
                    </span>
                    <span className="data block mt-0.5 text-[var(--ink-3)]">
                      {yearCourses} {yearCourses === 1 ? "course" : "courses"}
                    </span>
                  </span>
                  <Chevron open={isOpen} />
                </button>
              </h2>

              <div id={`year-${yearData.year}`} className={`disclosure ${isOpen ? "disclosure-open" : ""}`}>
                <div>
                  <div className="pb-6 space-y-7">
                    {filteredTerms.map((term) => (
                      <div key={term.name}>
                        <h3 className="meta pb-2 border-b border-[var(--rule)]">{term.name}</h3>

                        <ul>
                          {term.courses.map((course) => {
                            const noteData = notes[course.code];
                            const isExpanded = expandedCourse === course.code;
                            const hasContent = Boolean(
                              noteData &&
                                (noteData.description || noteData.notes || noteData.file_url)
                            );

                            return (
                              <li
                                key={course.code}
                                className="border-b border-[var(--rule)] last:border-b-0"
                              >
                                <button
                                  onClick={() => toggleCourse(course.code)}
                                  aria-expanded={isExpanded}
                                  aria-controls={`course-${course.code}`}
                                  className="w-full flex items-baseline gap-4 py-3 text-left group"
                                >
                                  <code className="data shrink-0 w-[7.5rem] text-[var(--accent)]">
                                    {course.code}
                                  </code>
                                  <span className="flex-1 min-w-0 text-[0.9375rem] leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                                    {course.name}
                                    {hasContent && (
                                      <span
                                        role="img"
                                        aria-label="Has notes or files"
                                        className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] align-middle"
                                      />
                                    )}
                                  </span>
                                  <Chevron open={isExpanded} />
                                </button>

                                {/* Topic chips sit outside the disclosure button —
                                    nesting buttons breaks keyboard navigation. */}
                                {course.topics.length > 0 && (
                                  <ul className="flex flex-wrap gap-1.5 pb-3 sm:pl-[8.5rem]">
                                    {course.topics.map((topic) => (
                                      <li key={topic}>
                                        <button
                                          onClick={() =>
                                            setFilterTopic(filterTopic === topic ? null : topic)
                                          }
                                          aria-pressed={filterTopic === topic}
                                          className={`tag ${filterTopic === topic ? "tag-active" : ""}`}
                                        >
                                          {topic}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                <div
                                  id={`course-${course.code}`}
                                  className={`disclosure ${isExpanded ? "disclosure-open" : ""}`}
                                >
                                  <div>
                                    <div className="pb-5 sm:pl-[8.5rem] space-y-4">
                                      {editingNote === course.code ? (
                                        <div className="space-y-3">
                                          <div>
                                            <label
                                              htmlFor={`desc-${course.code}`}
                                              className="meta block mb-1.5"
                                            >
                                              Description
                                            </label>
                                            <textarea
                                              id={`desc-${course.code}`}
                                              value={descriptionText}
                                              onChange={(e) => setDescriptionText(e.target.value)}
                                              className="field-area text-sm"
                                              rows={4}
                                              placeholder="What did this course cover?"
                                            />
                                          </div>
                                          <div>
                                            <label
                                              htmlFor={`note-${course.code}`}
                                              className="meta block mb-1.5"
                                            >
                                              Quick notes
                                            </label>
                                            <textarea
                                              id={`note-${course.code}`}
                                              value={noteText}
                                              onChange={(e) => setNoteText(e.target.value)}
                                              className="field-area text-sm min-h-[5rem]"
                                              rows={2}
                                              placeholder="Tips, reminders, links…"
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => saveNote(course.code)}
                                              className="btn"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={() => setEditingNote(null)}
                                              className="btn-quiet"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          {noteData?.description ? (
                                            <div>
                                              <p className="meta mb-1.5">Description</p>
                                              <p className="text-sm leading-relaxed whitespace-pre-wrap max-w-[60ch]">
                                                {noteData.description}
                                              </p>
                                            </div>
                                          ) : (
                                            <p className="text-sm text-[var(--ink-3)] italic">
                                              No description yet.
                                            </p>
                                          )}

                                          {noteData?.notes && (
                                            <div>
                                              <p className="meta mb-1.5">Notes</p>
                                              <p className="text-sm text-[var(--ink-2)] leading-relaxed whitespace-pre-wrap max-w-[60ch]">
                                                {noteData.notes}
                                              </p>
                                            </div>
                                          )}

                                          {noteData?.file_url && (
                                            <div>
                                              <p className="meta mb-1.5">Attached file</p>
                                              <div className="flex items-center gap-3 border border-[var(--rule)] bg-[var(--surface)] px-3 py-2.5">
                                                <a
                                                  href={noteData.file_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex-1 truncate text-sm text-[var(--accent)] hover:underline"
                                                >
                                                  {noteData.file_name || "View file"}
                                                </a>
                                                {user && (
                                                  <button
                                                    onClick={() => removeFile(course.code)}
                                                    className="btn-bare"
                                                  >
                                                    Remove
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {user && (
                                            <div className="flex flex-wrap items-center gap-5 pt-1">
                                              <button
                                                onClick={() => {
                                                  setEditingNote(course.code);
                                                  setDescriptionText(noteData?.description || "");
                                                  setNoteText(noteData?.notes || "");
                                                }}
                                                className="btn-bare"
                                              >
                                                {noteData?.description || noteData?.notes
                                                  ? "Edit notes"
                                                  : "Add notes"}
                                              </button>

                                              {/* Label + own input, so no shared ref can
                                                  point at the wrong course. */}
                                              <label
                                                htmlFor={`file-${course.code}`}
                                                className={`btn-bare cursor-pointer ${
                                                  uploading ? "opacity-60 pointer-events-none" : ""
                                                }`}
                                              >
                                                {uploading
                                                  ? "Uploading…"
                                                  : noteData?.file_url
                                                    ? "Replace file"
                                                    : "Upload file"}
                                                <span className="sr-only"> for {course.code}</span>
                                              </label>
                                              <input
                                                id={`file-${course.code}`}
                                                type="file"
                                                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg"
                                                className="sr-only"
                                                disabled={uploading}
                                                onChange={(e) => {
                                                  const file = e.target.files?.[0];
                                                  if (file) handleFileUpload(course.code, file);
                                                  e.target.value = "";
                                                }}
                                              />
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
