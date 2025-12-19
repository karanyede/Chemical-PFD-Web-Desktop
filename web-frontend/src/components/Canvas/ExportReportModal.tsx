// src/components/Export/ExportReportModal.tsx
import React, { useMemo } from "react";
import { useEditorStore } from "@/store/useEditorStore";

interface ExportReportModalProps {
  editorId: string;
  open: boolean;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  editorId,
  open,
  onClose,
}) => {
  const items = useEditorStore((s) =>
    s.getItemsInOrder(editorId)
  );

  const rows = useMemo(() => {
    return items.map((item, index) => ({
      slNo: index + 1,
      tagNo: item.label ?? "",
      type: item.name ?? item.object,
      description: item.description ?? "",
    }));
  }, [items]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[900px] rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Export Equipment Report</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        {/* Table */}
        <div className="max-h-[420px] overflow-auto px-6 py-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border px-3 py-2 w-16">Sl No</th>
                <th className="border px-3 py-2 w-40">Tag No</th>
                <th className="border px-3 py-2 w-48">Type</th>
                <th className="border px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slNo} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">{r.slNo}</td>
                  <td className="border px-3 py-2 font-medium">{r.tagNo}</td>
                  <td className="border px-3 py-2">{r.type}</td>
                  <td className="border px-3 py-2">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No components found in this diagram
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            onClick={() => exportToCSV(rows)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Export CSV
          </button>

          <button
            onClick={() => window.print()}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white hover:bg-black"
          >
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
};
