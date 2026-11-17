import { useState } from 'react';
import { DataGrid, type DataGridProps, type GridColDef, type GridValidRowModel } from '@mui/x-data-grid';
import { Card } from '@mui/material';
import { EmptyState } from './common';
import { money } from '../lib/format';

/** DataGrid with server-side pagination. `page` is 1-based to match the API. */
export function ServerGrid<R extends GridValidRowModel>({
  rows,
  total,
  loading,
  page,
  pageSize,
  onPage,
  ...rest
}: Omit<DataGridProps<R>, 'rows' | 'paginationModel' | 'onPaginationModelChange' | 'rowCount'> & {
  rows: R[];
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number, pageSize: number) => void;
}) {
  return (
    <Card>
      <DataGrid<R>
        rows={rows}
        rowCount={total}
        loading={loading}
        paginationMode="server"
        paginationModel={{ page: page - 1, pageSize }}
        onPaginationModelChange={(m) => onPage(m.page + 1, m.pageSize)}
        pageSizeOptions={[25, 50, 100]}
        autoHeight
        slots={{ noRowsOverlay: () => <EmptyState /> }}
        slotProps={{ loadingOverlay: { variant: 'skeleton', noRowsVariant: 'skeleton' } }}
        {...rest}
      />
    </Card>
  );
}

/** Client-side grid for short lists. */
export function SimpleGrid<R extends GridValidRowModel>(props: Omit<DataGridProps<R>, 'autoHeight'>) {
  return (
    <Card>
      <DataGrid<R>
        autoHeight
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ noRowsOverlay: () => <EmptyState /> }}
        slotProps={{ loadingOverlay: { variant: 'skeleton', noRowsVariant: 'skeleton' } }}
        {...props}
      />
    </Card>
  );
}

export const moneyCol = <R extends GridValidRowModel>(field: string, headerName: string, width = 120): GridColDef<R> => ({
  field,
  headerName,
  width,
  type: 'number',
  align: 'right',
  headerAlign: 'right',
  valueGetter: (v) => (v === null || v === undefined ? null : Number(v)),
  valueFormatter: (v) => money(v as number | null),
});

export function usePaging(initial = 25) {
  const [state, setState] = useState({ page: 1, pageSize: initial });
  return {
    ...state,
    onPage: (page: number, pageSize: number) => setState({ page: pageSize === state.pageSize ? page : 1, pageSize }),
    reset: () => setState((s) => ({ ...s, page: 1 })),
  };
}
