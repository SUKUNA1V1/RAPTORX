/**
 * CSV Importer component
 * Handles file upload, parsing, preview, and validation
 */
import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface CSVImporterProps {
  title: string;
  description?: string;
  headers: string[];
  onImport: (data: Record<string, unknown>[]) => Promise<void>;
  onValidate?: (data: Record<string, unknown>[]) => Promise<ValidationResult>;
  exampleData?: Record<string, unknown>[];
  loading?: boolean;
}

export interface ValidationResult {
  valid: Record<string, unknown>[];
  errors: Array<{
    row: number;
    message: string;
    data: Record<string, unknown>;
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

const CSVImporter = ({
  title,
  description,
  headers,
  onImport,
  onValidate,
  exampleData = [],
  loading = false,
}: CSVImporterProps) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<Record<string, unknown>[] | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'preview' | 'validated'>('upload');

  /**
   * Parse CSV file
   */
  const parseCSV = useCallback((file: File): Promise<Record<string, unknown>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            throw new Error('CSV file must have at least 2 rows (header + data)');
          }

          const headerLine = lines[0];
          const fileHeaders = headerLine.split(',').map(h => h.trim());

          // Validate headers
          const missingHeaders = headers.filter(h => !fileHeaders.includes(h));
          if (missingHeaders.length > 0) {
            throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
          }

          const data = lines.slice(1).map((line) => {
            const values = line.split(',').map(v => v.trim());
            const row: Record<string, unknown> = {};
            fileHeaders.forEach((header, idx) => {
              row[header] = values[idx] || '';
            });
            return row;
          });

          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, [headers]);

  /**
   * Handle file selection
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setValidationResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    try {
      setCsvFile(file);
      const data = await parseCSV(file);
      setCsvData(data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
    }
  };

  /**
   * Validate CSV data
   */
  const handleValidate = async () => {
    if (!csvData) return;
    try {
      const result = onValidate ? await onValidate(csvData) : { valid: csvData, errors: [], summary: { total: csvData.length, valid: csvData.length, invalid: 0 } };
      setValidationResult(result);
      setStep('validated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    }
  };

  /**
   * Confirm and import
   */
  const handleConfirm = async () => {
    if (!validationResult?.valid.length) {
      setError('No valid data to import');
      return;
    }
    try {
      await onImport(validationResult.valid);
      setStep('upload');
      setCsvFile(null);
      setCsvData(null);
      setValidationResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {description}
          </Typography>
        )}
      </Box>

      {/* Error Alert */}
      {error && <Alert severity="error">{error}</Alert>}

      {/* Upload Step */}
      {step === 'upload' && (
        <Card sx={{ p: 3, border: '2px dashed', borderColor: 'divider' }}>
          <Stack spacing={2} alignItems="center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="csv-input"
            />
            <label htmlFor="csv-input">
              <Button variant="contained" component="span">
                Choose CSV File
              </Button>
            </label>
            {csvFile && (
              <Typography variant="body2" color="success.main">
                ✓ {csvFile.name}
              </Typography>
            )}
          </Stack>

          {/* Example Columns */}
          {exampleData.length === 0 && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Required columns:
              </Typography>
              <Typography variant="caption" component="div">
                {headers.join(', ')}
              </Typography>
            </Box>
          )}
        </Card>
      )}

      {/* Preview Step */}
      {step === 'preview' && csvData && (
        <Stack spacing={2}>
          <Alert severity="info">
            Preview: {csvData.length} row(s) loaded. Review below then validate.
          </Alert>
          <TableContainer component={Card}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  {headers.map(header => (
                    <TableCell key={header} sx={{ fontWeight: 600 }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {csvData.slice(0, 5).map((row, idx) => (
                  <TableRow key={idx}>
                    {headers.map(header => (
                      <TableCell key={`${idx}-${header}`}>{String(row[header])}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {csvData.length > 5 && (
            <Typography variant="caption" color="text.secondary">
              ... and {csvData.length - 5} more rows
            </Typography>
          )}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => {
                setStep('upload');
                setCsvData(null);
              }}
            >
              Upload Different File
            </Button>
            <Button variant="contained" onClick={handleValidate} disabled={loading}>
              {loading ? 'Validating...' : 'Validate & Continue'}
            </Button>
          </Stack>
        </Stack>
      )}

      {/* Validation Result Step */}
      {step === 'validated' && validationResult && (
        <Stack spacing={2}>
          {loading && <LinearProgress />}

          {/* Summary */}
          <Card sx={{ p: 2, bgcolor: validationResult.summary.invalid === 0 ? 'success.lighter' : 'warning.lighter' }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={600}>
                Import Summary
              </Typography>
              <Typography variant="body2">
                Total: {validationResult.summary.total} | Valid: {validationResult.summary.valid} | Invalid:{' '}
                {validationResult.summary.invalid}
              </Typography>
            </Stack>
          </Card>

          {/* Valid Rows */}
          {validationResult.valid.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }} fontWeight={600}>
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                Valid Rows ({validationResult.valid.length})
              </Typography>
              <TableContainer component={Card} sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      {headers.map(header => (
                        <TableCell key={header} sx={{ fontWeight: 600 }}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validationResult.valid.slice(0, 3).map((row, idx) => (
                      <TableRow key={idx}>
                        {headers.map(header => (
                          <TableCell key={`${idx}-${header}`}>{String(row[header])}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {validationResult.valid.length > 3 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  ... and {validationResult.valid.length - 3} more
                </Typography>
              )}
            </Box>
          )}

          {/* Error Rows */}
          {validationResult.errors.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }} fontWeight={600}>
                <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
                Errors ({validationResult.errors.length})
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {validationResult.errors.slice(0, 3).map((error, idx) => (
                  <Alert key={idx} severity="error" sx={{ fontSize: '0.75rem' }}>
                    Row {error.row}: {error.message}
                  </Alert>
                ))}
              </Stack>
              {validationResult.errors.length > 3 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  ... and {validationResult.errors.length - 3} more errors
                </Typography>
              )}
            </Box>
          )}

          {/* Actions */}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => {
                setStep('upload');
                setCsvFile(null);
                setCsvData(null);
                setValidationResult(null);
              }}
              disabled={loading}
            >
              Start Over
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={!validationResult.valid.length || loading}
              endIcon={<ChevronRightIcon />}
            >
              {loading ? 'Importing...' : `Import ${validationResult.valid.length} Records`}
            </Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};

export default CSVImporter;
