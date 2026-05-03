import { useCallback, useState } from "react";
import { Upload, X, FileText, Link as LinkIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useTranslation } from "../hooks/use-translation";

interface EvidenceUploaderProps {
  controlId: number;
  onUploaded: () => void;
}

export function EvidenceUploader({ controlId, onUploaded }: EvidenceUploaderProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  }, []);

  const handleSubmit = async () => {
    if (!file && !link.trim()) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("control_id", String(controlId));
    if (note) formData.append("note", note);
    if (link) formData.append("external_link", link);
    if (file) formData.append("file", file);
    try {
      await fetch("/api/evidence", { method: "POST", body: formData, credentials: "include" });
      setFile(null);
      setNote("");
      setLink("");
      onUploaded();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors",
          dragOver ? "border-accent bg-accent/5" : "border-border bg-card/50"
        )}
      >
        {file ? (
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-accent" />
            <span className="text-sm">{file.name}</span>
            <button onClick={() => setFile(null)} className="rounded-full p-1 hover:bg-danger-dim">
              <X className="h-4 w-4 text-danger" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mb-2 h-6 w-6 text-muted" />
            <p className="text-sm text-muted">{t("evidence.choose_file")}</p>
            <Input
              type="file"
              className="mt-2 w-auto"
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            />
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-muted" />
        <Input
          placeholder={t("evidence.external_link_placeholder")}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="flex-1"
        />
      </div>
      <Input
        placeholder={t("evidence.note_placeholder")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button onClick={handleSubmit} disabled={uploading || (!file && !link.trim())} className="w-full">
        {uploading ? t("evidence.uploading") : t("evidence.upload")}
      </Button>
    </div>
  );
}
