'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ListingDraft, CloudinaryImage } from '@/types/listing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ─── Per-image upload state ───────────────────────────────────────────────────

interface UploadItem {
  id: string; // temp ID before Cloudinary
  preview: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  result?: CloudinaryImage;
  errorMsg?: string;
}

// ─── Cloudinary upload ───────────────────────────────────────────────────────

async function uploadToCloudinary(
  file: File,
  onProgress: (p: number) => void,
): Promise<CloudinaryImage> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const d = JSON.parse(xhr.responseText);
        resolve({ publicId: d.public_id, url: d.secure_url, width: d.width, height: d.height });
      } else {
        reject(new Error('Upload failed. Check your Cloudinary preset.'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    );
    xhr.send(formData);
  });
}

// ─── Sortable Image Card ─────────────────────────────────────────────────────

interface SortableCardProps {
  item: UploadItem;
  index: number;
  onDelete: (id: string) => void;
}

function SortableCard({ item, index, onDelete }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: item.status !== 'done',
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative aspect-square overflow-hidden rounded-2xl border-2 transition-all",
        isDragging ? 'border-primary opacity-60 shadow-xl' : 'border-gray-100',
        item.status === 'error' ? 'border-error/50' : ''
      )}
    >
      {/* Image */}
      <img src={item.preview} alt="" className="h-full w-full object-cover" />

      {/* Cover badge */}
      {index === 0 && item.status === 'done' && (
        <div className="absolute bottom-0 left-0 right-0 bg-primary/80 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          Cover photo
        </div>
      )}

      {/* Upload progress overlay */}
      {item.status === 'uploading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <svg className="mb-2 h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="mt-1 text-xs text-white">{item.progress}%</span>
        </div>
      )}

      {/* Error overlay */}
      {item.status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-error/80 p-3">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p className="text-center text-[10px] leading-tight text-white">{item.errorMsg ?? 'Upload failed'}</p>
        </div>
      )}

      {/* Drag handle */}
      {item.status === 'done' && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-2 cursor-grab rounded-lg bg-white/90 p-1.5 shadow-sm active:cursor-grabbing"
          title="Drag to reorder"
        >
          <svg className="h-3.5 w-3.5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
          </svg>
        </div>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 shadow-sm transition-colors hover:bg-error/10 hover:text-error"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  draft: ListingDraft;
  onChange: (u: Partial<ListingDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const MAX_IMAGES = 6;

// ─── Step 2 ───────────────────────────────────────────────────────────────────

export default function Step2Photos({ draft, onChange, onNext, onPrev }: Props) {
  const [items, setItems] = useState<UploadItem[]>(() =>
    draft.images.map((img) => ({
      id: img.publicId,
      preview: img.url,
      status: 'done' as const,
      progress: 100,
      result: img,
    })),
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync done images back to draft whenever items change
  useEffect(() => {
    const doneImages = items.filter((it) => it.status === 'done' && it.result).map((it) => it.result!);
    onChange({ images: doneImages });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      setGlobalError('');
      const fileArr = Array.from(files);
      const remaining = MAX_IMAGES - items.filter((it) => it.status !== 'error').length;

      if (remaining <= 0) {
        setGlobalError(`Maximum ${MAX_IMAGES} photos allowed.`);
        return;
      }

      const toProcess = fileArr.slice(0, remaining);
      if (fileArr.length > remaining) {
        setGlobalError(`Only ${remaining} more photo${remaining > 1 ? 's' : ''} can be added.`);
      }

      const validFiles: File[] = [];
      const invalidErrors: string[] = [];

      toProcess.forEach((file) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          invalidErrors.push(`${file.name} is an invalid format.`);
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          invalidErrors.push(`${file.name} exceeds 5MB.`);
          return;
        }
        validFiles.push(file);
      });

      if (invalidErrors.length > 0) {
        setGlobalError((prev) => (prev ? prev + ' ' : '') + invalidErrors.join(' '));
      }

      if (validFiles.length === 0) return;

      const newItems: UploadItem[] = validFiles.map((file) => ({
        id: `tmp_${Date.now()}_${Math.random()}`,
        preview: URL.createObjectURL(file),
        status: 'uploading',
        progress: 0,
      }));

      setItems((prev) => [...prev, ...newItems]);

      // Upload each file
      newItems.forEach((item, i) => {
        uploadToCloudinary(validFiles[i], (p) => {
          setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, progress: p } : it)));
        })
          .then((result) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, id: result.publicId, status: 'done', progress: 100, result } : it,
              ),
            );
          })
          .catch((err) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, status: 'error', errorMsg: err.message } : it,
              ),
            );
          });
      });
    },
    [items],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((it) => it.id === active.id);
        const newIndex = prev.findIndex((it) => it.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleDelete = (id: string) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item?.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      return prev.filter((it) => it.id !== id);
    });
    setGlobalError('');
  };

  const sortableIds = items.map((it) => it.id);
  const doneCount = items.filter((it) => it.status === 'done').length;
  const uploadingCount = items.filter((it) => it.status === 'uploading').length;

  const handleNext = () => {
    if (uploadingCount > 0) {
      setGlobalError('Please wait for all uploads to complete.');
      return;
    }
    if (doneCount === 0) {
      setGlobalError('Please add at least one photo.');
      return;
    }
    onNext();
  };

  return (
    <div className="flex flex-col h-full py-2">
      <div className="mb-12">
        <h2 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">Show off your gear</h2>
        <p className="mt-2 text-lg text-muted">
          Upload up to 6 high-quality photos. The first image will be your cover photo. Drag to reorder.
        </p>
      </div>

      {/* Drop zone */}
      {items.length < MAX_IMAGES && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            processFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "mb-8 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed py-16 transition-all duration-300 select-none",
            isDragOver
              ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10'
              : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.01] shadow-sm'
          )}
        >
          <div className={cn(
            "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300",
            isDragOver ? 'bg-primary/15 text-primary scale-110' : 'bg-gray-50 text-muted'
          )}>
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <p className={cn("font-semibold text-base transition-colors", isDragOver ? 'text-primary' : 'text-foreground')}>
            {isDragOver ? 'Drop photos here' : 'Drag photos here, or click to browse'}
          </p>
          <p className="mt-2 text-sm text-muted">PNG, JPG, WEBP — up to 5 MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
          />
        </div>
      )}

      {/* Error */}
      {globalError && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-error/20 bg-error/5 px-5 py-4 text-sm text-error font-medium">
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {globalError}
        </div>
      )}

      {/* Photo grid */}
      {items.length > 0 && (
        <div className="mb-8">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {items.map((item, i) => (
                  <SortableCard key={item.id} item={item} index={i} onDelete={handleDelete} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <p className="mt-4 text-sm font-medium text-muted text-center">
            {doneCount} of {MAX_IMAGES} photos added
            {uploadingCount > 0 && ` · ${uploadingCount} uploading…`}
          </p>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Navigation Footer */}
      <div className="flex justify-between pt-8 pb-4">
        <Button variant="outline" type="button" onClick={onPrev} size="lg" className="px-6 rounded-full text-base font-bold border-gray-200 hover:bg-gray-50 transition-all">
          Back
        </Button>
        <Button type="button" onClick={handleNext} size="lg" className="px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          Next Step
        </Button>
      </div>
    </div>
  );
}
