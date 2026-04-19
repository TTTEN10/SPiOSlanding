import { useState, useEffect } from 'react';
import { List, Search, X } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  level: number;
}

interface TableOfContentsProps {
  sections: Section[];
  className?: string;
}

export default function TableOfContents({ sections, className = '' }: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL without reload
      window.history.pushState(null, '', `#${id}`);
    }
  };

  const filteredSections = sections.filter((section) =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (sections.length === 0) return null;

  return (
    <div className={`sticky top-4 ${className}`}>
      <div className="bg-white/70 dark:bg-black/30 backdrop-blur-sm rounded-lg border border-neutral-dark/20 dark:border-white/20 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-heading flex items-center gap-2">
            <List className="w-5 h-5" />
            Table of Contents
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <X className="w-4 h-4" />
            ) : (
              <List className="w-4 h-4" />
            )}
          </button>
        </div>

        {isExpanded && (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sections..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900"
              />
            </div>

            {/* Sections List */}
            <nav className="space-y-1 max-h-[600px] overflow-y-auto">
              {filteredSections.length === 0 ? (
                <p className="text-sm text-body opacity-75 py-2">No sections found</p>
              ) : (
                filteredSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors text-sm ${
                      activeSection === section.id
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                        : 'text-body hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    style={{ paddingLeft: `${section.level * 0.75 + 0.75}rem` }}
                  >
                    {section.title}
                  </button>
                ))
              )}
            </nav>

            {/* Jump to Top */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-4 w-full text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              ↑ Back to top
            </button>
          </>
        )}
      </div>
    </div>
  );
}

