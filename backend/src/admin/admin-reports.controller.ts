import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { RequirePermission } from '../common/auth/permission.guard';
import { ReportsService } from './reports.service';
import { DateRangeDto, FairnessQueryDto } from './dto/admin.dto';

const MAX_RANGE_DAYS = 366;

function range(q: DateRangeDto) {
  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30 * 86_400_000);
  if (from >= to) throw new BadRequestException('from must be before to');
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86_400_000) throw new BadRequestException('Range is limited to one year');
  return { from, to };
}

@Controller('admin')
export class AdminReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  @RequirePermission('reports.read')
  overview() {
    return this.reports.overview();
  }

  @Get('reports/summary')
  @RequirePermission('reports.read')
  summary(@Query() q: DateRangeDto) {
    const { from, to } = range(q);
    return this.reports.summary(from, to);
  }

  @Get('reports/fairness')
  @RequirePermission('reports.read')
  fairness(@Query() q: FairnessQueryDto) {
    return this.reports.fairness(q.date ? new Date(q.date) : new Date());
  }

  @Get('reports/trips.csv')
  @RequirePermission('reports.export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async tripsCsv(@Query() q: DateRangeDto, @Res() res: Response) {
    const { from, to } = range(q);
    const csv = await this.reports.tripsCsv(from, to);
    res.setHeader('Content-Disposition', `attachment; filename="trips-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }
}
