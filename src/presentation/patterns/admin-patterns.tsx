import type { ReactNode } from "react";
import { Link, type Href } from "expo-router";

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: Href }> }) {
  return (
    <nav aria-label="パンくず" className="breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href === undefined ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description !== undefined && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <section className="filter-bar" aria-label="検索と絞り込み">
      {children}
    </section>
  );
}

export function AppliedFilters({
  filters,
  onRemove,
  onClear,
}: {
  filters: Array<{ id: string; label: string }>;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (filters.length === 0) {
    return null;
  }
  return (
    <div className="applied-filters" aria-label="適用中の条件">
      {filters.map((filter) => (
        <button key={filter.id} type="button" onClick={() => onRemove(filter.id)}>
          {filter.label} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" onClick={onClear}>
        条件をすべて解除
      </button>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="ページ送り">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        前へ
      </button>
      <span>
        {page} / {Math.max(totalPages, 1)}ページ
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        次へ
      </button>
    </nav>
  );
}

export function ContextualSaveBar({
  dirty,
  onDiscard,
  onSave,
  saving = false,
}: {
  dirty: boolean;
  onDiscard: () => void;
  onSave: () => void;
  saving?: boolean;
}) {
  if (!dirty) {
    return null;
  }
  return (
    <div className="contextual-save-bar" role="region" aria-label="未保存の変更">
      <p>保存されていない変更があります。</p>
      <button type="button" className="button button--tertiary" onClick={onDiscard}>
        変更を破棄
      </button>
      <button type="button" className="button button--primary" onClick={onSave} disabled={saving}>
        {saving ? "処理中" : "保存"}
      </button>
    </div>
  );
}

export function ResourceTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: Array<{ id: string; cells: ReactNode[] }>;
}) {
  return (
    <div className="resource-table-scroll">
      <table className="resource-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={index}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
