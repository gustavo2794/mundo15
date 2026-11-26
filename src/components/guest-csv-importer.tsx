'use client';

import { useMemo, useRef, useState } from 'react';
import type { TableItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';

type ParsedGuestRow = {
  id: string;
  name: string;
  tableName: string;
  isDuplicate: boolean;
};

interface GuestCsvImporterProps {
  tables: TableItem[];
  onImportTables: (updatedTables: TableItem[]) => Promise<void>;
}

const SAMPLE_CSV = `\uFEFFNombre,Mesa
María Elena García,Mesa de Honor
Carlos Montemayor,Mesa de Honor
Sofía Pérez López,Amigas Escuela
Diego Hernández,Chambelanes
Tía Lupita Ramírez,Familia Materna
Abuelita Carmen,Mesa de Honor
`;

function detectDelimiter(line: string): string {
  const counts = [
    { delim: ',', count: (line.match(/,/g) || []).length },
    { delim: ';', count: (line.match(/;/g) || []).length },
    { delim: '\t', count: (line.match(/\t/g) || []).length },
  ];
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delim : ',';
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isHeaderRow(cols: string[]): { isHeader: boolean; nameIdx: number; tableIdx: number } {
  const normCols = cols.map(normalizeText);
  const nameKeywords = ['nombre', 'invitado', 'invitada', 'guest', 'name', 'persona', 'asistente'];
  const tableKeywords = ['mesa', 'table', 'grupo', 'group', 'seccion', 'zona'];

  const nameIdx = normCols.findIndex((c) => nameKeywords.some((k) => c === k || c.includes(k)));
  const tableIdx = normCols.findIndex((c) => tableKeywords.some((k) => c === k || c.includes(k)));

  if (nameIdx !== -1 || tableIdx !== -1) {
    return {
      isHeader: true,
      nameIdx: nameIdx !== -1 ? nameIdx : 0,
      tableIdx: tableIdx !== -1 ? tableIdx : 1,
    };
  }
  return { isHeader: false, nameIdx: 0, tableIdx: 1 };
}

export function exportGuestsToCsv(tables: TableItem[]): void {
  const rows: string[] = ['Nombre,Mesa'];
  for (const table of tables) {
    const safeTable = `"${table.tableName.replace(/"/g, '""')}"`;
    if (table.guests.length === 0) {
      continue;
    }
    for (const guest of table.guests) {
      const safeGuest = `"${guest.replace(/"/g, '""')}"`;
      rows.push(`${safeGuest},${safeTable}`);
    }
  }
  const csvContent = `\uFEFF${rows.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invitados-xv-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function GuestCsvImporter({ tables, onImportTables }: GuestCsvImporterProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [assignmentMode, setAssignmentMode] = useState<'from_csv' | 'single_table'>('from_csv');
  const [targetTableSelection, setTargetTableSelection] = useState<string>(
    tables.length > 0 ? tables[0].id : '__new__'
  );
  const [customTableName, setCustomTableName] = useState('Invitados Importados');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const existingGuestSet = useMemo(() => {
    const set = new Set<string>();
    for (const t of tables) {
      for (const g of t.guests) {
        set.add(normalizeText(g));
      }
    }
    return set;
  }, [tables]);

  const parsedData = useMemo(() => {
    const cleaned = rawText.replace(/^\uFEFF/, '').trim();
    if (!cleaned) {
      return { rows: [] as ParsedGuestRow[], newCount: 0, dupCount: 0, newTablesCount: 0 };
    }

    const rawLines = cleaned
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) {
      return { rows: [] as ParsedGuestRow[], newCount: 0, dupCount: 0, newTablesCount: 0 };
    }

    const delimiter = detectDelimiter(rawLines[0]);
    const firstCols = parseCsvLine(rawLines[0], delimiter);
    const headerInfo = isHeaderRow(firstCols);

    const startIndex = headerInfo.isHeader ? 1 : 0;
    const nameCol = headerInfo.nameIdx;
    const tableCol = headerInfo.tableIdx;

    const fallbackSingleTableName =
      assignmentMode === 'single_table'
        ? targetTableSelection === '__new__'
          ? customTableName.trim() || 'Mesa General'
          : tables.find((t) => t.id === targetTableSelection)?.tableName || 'Mesa General'
        : 'Mesa General';

    const seenInFile = new Set<string>();
    const rows: ParsedGuestRow[] = [];

    for (let i = startIndex; i < rawLines.length; i++) {
      const cols = parseCsvLine(rawLines[i], delimiter);
      const rawName = (cols[nameCol] || '').trim().slice(0, 120);
      if (!rawName) continue;

      const rawTableFromCsv = (cols[tableCol] || '').trim().slice(0, 100);
      const assignedTable =
        assignmentMode === 'single_table'
          ? fallbackSingleTableName
          : rawTableFromCsv || 'Mesa General';

      const normName = normalizeText(rawName);
      const isDuplicate = existingGuestSet.has(normName) || seenInFile.has(normName);
      seenInFile.add(normName);

      rows.push({
        id: `row_${i}`,
        name: rawName,
        tableName: assignedTable,
        isDuplicate,
      });
    }

    const activeRows = skipDuplicates ? rows.filter((r) => !r.isDuplicate) : rows;
    const existingTableNames = new Set(tables.map((t) => normalizeText(t.tableName)));
    const newTables = new Set<string>();
    for (const r of activeRows) {
      const normT = normalizeText(r.tableName);
      if (!existingTableNames.has(normT)) {
        newTables.add(normT);
      }
    }

    return {
      rows,
      newCount: rows.filter((r) => !r.isDuplicate).length,
      dupCount: rows.filter((r) => r.isDuplicate).length,
      newTablesCount: newTables.size,
    };
  }, [rawText, assignmentMode, targetTableSelection, customTableName, tables, existingGuestSet, skipDuplicates]);

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-invitados-xv.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReadFile = async (file: File) => {
    if (!file.name.match(/\.(csv|txt)$/i) && !file.type.includes('text') && !file.type.includes('csv')) {
      toast({
        variant: 'destructive',
        title: 'Formato no compatible',
        description: 'Selecciona un archivo .csv o .txt exportado desde Excel o Google Sheets.',
      });
      return;
    }
    try {
      const text = await file.text();
      setFileName(file.name);
      setRawText(text);
    } catch (error) {
      console.error('Error al leer archivo CSV:', error);
      toast({
        variant: 'destructive',
        title: 'Error al leer archivo',
        description: 'No pudimos leer el contenido del archivo seleccionado.',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      void handleReadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleReadFile(file);
    }
  };

  const handleConfirmImport = async () => {
    const rowsToImport = skipDuplicates
      ? parsedData.rows.filter((r) => !r.isDuplicate)
      : parsedData.rows;

    if (rowsToImport.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin invitados nuevos para importar',
        description: 'Verifica que el CSV contenga nombres válidos o desactiva el filtro de duplicados.',
      });
      return;
    }

    // Clone existing tables
    const nextTables: TableItem[] = tables.map((t) => ({
      ...t,
      guests: [...t.guests],
    }));

    const tableLookup = new Map<string, TableItem>();
    for (const t of nextTables) {
      tableLookup.set(normalizeText(t.tableName), t);
    }

    for (const row of rowsToImport) {
      const normTable = normalizeText(row.tableName);
      let target = tableLookup.get(normTable);

      if (!target) {
        if (nextTables.length >= 100) {
          toast({
            variant: 'destructive',
            title: 'Límite de mesas alcanzado',
            description: 'Se alcanzó el máximo permitido de 100 mesas por evento.',
          });
          return;
        }
        target = {
          id: `tbl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          tableName: row.tableName,
          guests: [],
        };
        nextTables.push(target);
        tableLookup.set(normTable, target);
      }

      target.guests.push(row.name);
    }

    setSubmitting(true);
    try {
      await onImportTables(nextTables);
      toast({
        title: '¡Invitados importados!',
        description: `Se agregaron ${rowsToImport.length} invitados a tu lista de mesas.`,
      });
      setRawText('');
      setFileName('');
      setOpen(false);
    } catch (error) {
      console.error('Error al guardar invitados importados:', error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar lista',
        description: 'No se pudo guardar en tu perfil. Intenta de nuevo.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalToImport = skipDuplicates ? parsedData.newCount : parsedData.rows.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 min-h-[40px] whitespace-nowrap shrink-0">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Invitados desde CSV
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Sube un archivo CSV de Excel o Google Sheets, o pega tu lista de nombres para asignarlos automáticamente a sus mesas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Top toolbar: Template download + input mode tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div className="inline-flex rounded-lg bg-muted/60 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setInputMode('file')}
                className={`rounded-md px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  inputMode === 'file'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Subir Archivo (.csv)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('paste')}
                className={`rounded-md px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  inputMode === 'paste'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pegar Lista / Texto
              </button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs text-primary hover:text-primary h-9 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar Plantilla CSV
            </Button>
          </div>

          {/* Input Area */}
          {inputMode === 'file' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
              {fileName ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Archivo cargado. Haz clic para elegir otro archivo si lo deseas.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Arrastra tu archivo CSV aquí o haz clic para seleccionarlo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Columnas aceptadas: <span className="font-mono">Nombre, Mesa</span> (separado por comas o punto y coma). También puedes subir solo una columna de nombres.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="csvPasteInput" className="text-xs font-semibold">
                Pega tus invitados (uno por línea, o formato Nombre, Mesa)
              </Label>
              <Textarea
                id="csvPasteInput"
                rows={6}
                placeholder={`Ejemplo:\nNombre, Mesa\nMaría Elena García, Mesa de Honor\nCarlos Montemayor, Mesa de Honor\nSofía Pérez, Amigas Escuela`}
                value={rawText}
                onChange={(e) => {
                  setFileName('');
                  setRawText(e.target.value);
                }}
                className="font-mono text-xs leading-relaxed"
              />
            </div>
          )}

          {/* Assignment & Duplicate Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Asignación de Mesas</Label>
              <Select
                value={assignmentMode}
                onValueChange={(v) => setAssignmentMode(v as 'from_csv' | 'single_table')}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="from_csv">Usar columna &quot;Mesa&quot; del archivo (auto-crear mesas)</SelectItem>
                  <SelectItem value="single_table">Asignar todos a una sola mesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignmentMode === 'single_table' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mesa Destino</Label>
                <Select value={targetTableSelection} onValueChange={setTargetTableSelection}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.tableName} ({t.guests.length} invitados)
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Crear nueva mesa...</SelectItem>
                  </SelectContent>
                </Select>
                {targetTableSelection === '__new__' && (
                  <Input
                    value={customTableName}
                    onChange={(e) => setCustomTableName(e.target.value)}
                    placeholder="Nombre de la nueva mesa"
                    className="h-8 text-xs mt-1.5 bg-background"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 sm:pt-5">
                <Checkbox
                  id="skipDuplicatesOpt"
                  checked={skipDuplicates}
                  onCheckedChange={(val) => setSkipDuplicates(Boolean(val))}
                />
                <Label htmlFor="skipDuplicatesOpt" className="text-xs cursor-pointer leading-snug">
                  Omitir nombres duplicados ya existentes en tu lista o repetidos en el archivo
                </Label>
              </div>
            )}

            {assignmentMode === 'single_table' && (
              <div className="sm:col-span-2 flex items-center space-x-2 pt-1">
                <Checkbox
                  id="skipDuplicatesOptSingle"
                  checked={skipDuplicates}
                  onCheckedChange={(val) => setSkipDuplicates(Boolean(val))}
                />
                <Label htmlFor="skipDuplicatesOptSingle" className="text-xs cursor-pointer leading-snug">
                  Omitir nombres duplicados ya existentes en tu lista o repetidos en el archivo
                </Label>
              </div>
            )}
          </div>

          {/* Preview & Summary */}
          {parsedData.rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground tabular-nums">
                  <span className="font-semibold text-foreground">
                    {parsedData.rows.length} filas leídas
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {totalToImport} listos para importar
                  </span>
                  {parsedData.dupCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {parsedData.dupCount} duplicados detectados
                      </span>
                    </>
                  )}
                  {parsedData.newTablesCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {parsedData.newTablesCount} {parsedData.newTablesCount === 1 ? 'mesa nueva' : 'mesas nuevas'}
                      </span>
                    </>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRawText('');
                    setFileName('');
                  }}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpiar
                </Button>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-border/80">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border/80 text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 font-semibold">#</th>
                      <th className="py-2 px-3 font-semibold">Nombre del Invitado</th>
                      <th className="py-2 px-3 font-semibold">Mesa Asignada</th>
                      <th className="py-2 px-3 font-semibold text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {parsedData.rows.slice(0, 100).map((row, idx) => {
                      const skipped = skipDuplicates && row.isDuplicate;
                      return (
                        <tr
                          key={row.id}
                          className={skipped ? 'opacity-50 bg-muted/20' : 'hover:bg-muted/30'}
                        >
                          <td className="py-2 px-3 font-mono tabular-nums text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-medium text-foreground">{row.name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.tableName}</td>
                          <td className="py-2 px-3 text-right">
                            {row.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <AlertCircle className="h-3 w-3" />
                                {skipped ? 'Omitido' : 'Duplicado'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <Check className="h-3 w-3" />
                                Nuevo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsedData.rows.length > 100 && (
                  <div className="p-2 text-center text-[11px] text-muted-foreground bg-muted/20 border-t">
                    Mostrando primeros 100 de {parsedData.rows.length} invitados detectados.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="min-h-[40px]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={submitting || totalToImport === 0}
              onClick={handleConfirmImport}
              className="gap-1.5 min-h-[40px]"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Importar {totalToImport > 0 ? `${totalToImport} Invitados` : 'Invitados'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
