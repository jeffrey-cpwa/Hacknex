import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  Tag,
  ArrowUpDown,
  Search,
  FolderInput,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface EditModeToolbarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  onApplyTag: (tag: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  searchFilter: string;
  setSearchFilter: (query: string) => void;
  onRenameSelected: () => void;
}

export const EditModeToolbar: React.FC<EditModeToolbarProps> = ({
  selectedCount,
  totalCount,
  allSelected,
  onToggleSelectAll,
  onDeleteSelected,
  onApplyTag,
  sortBy,
  setSortBy,
  searchFilter,
  setSearchFilter,
  onRenameSelected,
}) => {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const availableTags = ['Security', 'Factory', 'Warehouse', 'Machine', 'Delivery', 'Incident'];
  const sortOptions = [
    { id: 'newest', label: 'Newest First' },
    { id: 'oldest', label: 'Oldest First' },
    { id: 'duration', label: 'Longest Duration' },
    { id: 'events', label: 'Most Events' },
  ];

  return (
    <div style={styles.toolbar}>
      {/* Left Action Buttons */}
      <div style={styles.leftGroup}>
        <button onClick={onToggleSelectAll} style={styles.btnTool}>
          {allSelected ? <CheckSquare size={14} color="#F59E0B" /> : <Square size={14} />}
          <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          <span style={styles.counterPill}>
            {selectedCount}/{totalCount}
          </span>
        </button>

        <div style={styles.separator} />

        <button
          onClick={onRenameSelected}
          disabled={selectedCount !== 1}
          style={styles.btnTool}
          title={selectedCount !== 1 ? 'Select exactly 1 footage to rename' : 'Rename footage'}
        >
          <Edit2 size={13} />
          <span>Rename</span>
        </button>

        {/* Tag Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setTagDropdownOpen((prev) => !prev)}
            disabled={selectedCount === 0}
            style={styles.btnTool}
          >
            <Tag size={13} />
            <span>Tag</span>
            <ChevronDown size={11} />
          </button>

          {tagDropdownOpen && (
            <div style={styles.dropdown}>
              <div style={styles.dropdownTitle}>APPLY EVIDENCE TAG</div>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    onApplyTag(tag);
                    setTagDropdownOpen(false);
                  }}
                  style={styles.dropdownItem}
                >
                  <Tag size={11} color="#F59E0B" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => alert(`Footage moved to Target Archive Folder.`)}
          disabled={selectedCount === 0}
          style={styles.btnTool}
        >
          <FolderInput size={13} />
          <span>Move</span>
        </button>

        <button
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
          style={{ ...styles.btnTool, ...styles.btnDelete }}
        >
          <Trash2 size={13} />
          <span>Delete ({selectedCount})</span>
        </button>
      </div>

      {/* Right: Search & Sorting */}
      <div style={styles.rightGroup}>
        {/* Search */}
        <div style={styles.searchBox}>
          <Search size={13} color="#9299A4" />
          <input
            type="text"
            placeholder="Search footage..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Sort dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setSortDropdownOpen((prev) => !prev)}
            style={styles.sortBtn}
          >
            <ArrowUpDown size={13} color="#F59E0B" />
            <span>Sort: {sortOptions.find((s) => s.id === sortBy)?.label}</span>
            <ChevronDown size={11} />
          </button>

          {sortDropdownOpen && (
            <div style={{ ...styles.dropdown, right: 0 }}>
              <div style={styles.dropdownTitle}>SORT FOOTAGE BY</div>
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSortBy(opt.id);
                    setSortDropdownOpen(false);
                  }}
                  style={{
                    ...styles.dropdownItem,
                    color: sortBy === opt.id ? '#F59E0B' : '#F5F7FA',
                  }}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    backgroundColor: '#0F1217',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  btnTool: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 9px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnDelete: {
    color: '#EF4444',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  counterPill: {
    fontSize: '10px',
    backgroundColor: '#08090B',
    padding: '1px 5px',
    borderRadius: '3px',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  separator: {
    width: '1px',
    height: '18px',
    backgroundColor: 'var(--border-subtle)',
    margin: '0 4px',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#08090B',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xs)',
    padding: '4px 8px',
    width: '180px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#F5F7FA',
    fontSize: '11.5px',
    width: '100%',
  },
  sortBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 9px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  dropdown: {
    position: 'absolute',
    top: '110%',
    left: 0,
    backgroundColor: '#12151A',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px',
    zIndex: 100,
    boxShadow: 'var(--shadow-lg)',
    minWidth: '160px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  dropdownTitle: {
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    padding: '4px 6px',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: '3px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#E5E7EB',
    fontSize: '11.5px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
};
