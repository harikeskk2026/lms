'use client'

export default function ResumePreview({ resumeData, studentName }) {
  if (!resumeData) {
    return (
      <div className="resume-preview bg-white rounded-xl p-5 sm:p-8 text-center text-gray-400">
        <p className="text-sm">Fill in your details to see the preview</p>
      </div>
    )
  }

  const {
    headline, summary, phone, email, linkedinUrl, githubUrl, portfolioUrl, location,
    education = [], experience = [], projects = [], certifications = [], languages = []
  } = resumeData

  const name = studentName || 'Your Name'

  return (
    <div className="resume-preview bg-white text-gray-900 text-[11px] leading-tight font-sans p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200" style={{ minHeight: 600 }}>
      {/* Header */}
      <div className="border-b-2 border-purple-600 pb-3 mb-3">
        <h1 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-wide break-words">{name}</h1>
        {headline && <p className="text-purple-700 font-medium text-xs mt-0.5">{headline}</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-gray-600">
          {phone && <span>📱 {phone}</span>}
          {email && <span>✉ {email}</span>}
          {location && <span>📍 {location}</span>}
          {linkedinUrl && <span>🔗 {linkedinUrl.replace('https://', '')}</span>}
          {githubUrl && <span>⌥ {githubUrl.replace('https://', '')}</span>}
          {portfolioUrl && <span>🌐 {portfolioUrl.replace('https://', '')}</span>}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <Section title="SUMMARY">
          <p className="text-gray-700 leading-relaxed">{summary}</p>
        </Section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <Section title="EDUCATION">
          {education.map((edu, i) => (
            <div key={i} className="mb-1.5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-gray-800">{edu.degree || 'Degree'}</span>
                  {edu.institution && <span className="text-gray-600"> · {edu.institution}</span>}
                </div>
                <span className="text-gray-500 text-[10px]">{edu.year || ''}</span>
              </div>
              {edu.grade && <p className="text-gray-500 text-[10px]">Grade: {edu.grade}</p>}
            </div>
          ))}
        </Section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <Section title="WORK EXPERIENCE">
          {experience.map((exp, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-gray-800">{exp.role || 'Role'}</span>
                  {exp.company && <span className="text-gray-600"> · {exp.company}</span>}
                </div>
                <span className="text-gray-500 text-[10px]">{exp.duration || ''}</span>
              </div>
              {exp.description && <p className="text-gray-600 mt-0.5 leading-relaxed">{exp.description}</p>}
            </div>
          ))}
        </Section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <Section title="PROJECTS">
          {projects.map((proj, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-gray-800">{proj.name || 'Project'}</span>
                <div className="flex gap-2">
                  {proj.github && <span className="text-purple-600 text-[10px]">GitHub</span>}
                  {proj.live && <span className="text-purple-600 text-[10px]">Live</span>}
                </div>
              </div>
              {proj.tech && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(Array.isArray(proj.tech) ? proj.tech : proj.tech.split(',')).map((t, ti) => (
                    <span key={ti} className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[9px]">{t.trim()}</span>
                  ))}
                </div>
              )}
              {proj.description && <p className="text-gray-600 mt-0.5 leading-relaxed">{proj.description}</p>}
            </div>
          ))}
        </Section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <Section title="CERTIFICATIONS">
          {certifications.map((cert, i) => (
            <div key={i} className="flex justify-between mb-1">
              <div>
                <span className="font-medium text-gray-800">{cert.name || 'Certification'}</span>
                {cert.issuer && <span className="text-gray-500"> · {cert.issuer}</span>}
              </div>
              <span className="text-gray-400 text-[10px]">{cert.date || ''}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <Section title="LANGUAGES">
          <div className="flex flex-wrap gap-2">
            {languages.map((lang, i) => (
              <span key={i} className="text-gray-700">
                <span className="font-medium">{typeof lang === 'string' ? lang : (lang.name || 'Language')}</span>
                {typeof lang === 'object' && lang.level && <span className="text-gray-400"> ({lang.level})</span>}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {!summary && education.length === 0 && experience.length === 0 && projects.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <p className="text-sm">Start filling the form to see your resume here</p>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-3">
      <h2 className="text-[10px] font-bold text-purple-700 uppercase tracking-widest border-l-2 border-purple-500 pl-1.5 mb-1.5">{title}</h2>
      {children}
    </div>
  )
}
