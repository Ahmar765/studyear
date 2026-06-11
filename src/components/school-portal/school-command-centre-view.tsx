'use client';

import type { SchoolCommandCentrePayload } from '@/types/school-portal';
import { SchoolCommandHero } from '@/components/school-portal/school-command-hero';
import { SchoolKpiBar } from '@/components/school-portal/school-kpi-bar';
import { SchoolHealthMap } from '@/components/school-portal/school-health-map';
import { SchoolRiskPanel } from '@/components/school-portal/school-risk-panel';
import { SchoolTimeline } from '@/components/school-portal/school-timeline';
import { SchoolInsightSnapshot } from '@/components/school-portal/school-insight-snapshot';
import { SchoolInterventionPipeline } from '@/components/school-portal/school-intervention-pipeline';
import { SchoolAcuPanel } from '@/components/school-portal/school-acu-panel';
import { SchoolPeopleSetupPanel } from '@/components/school-portal/school-people-setup-panel';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function SchoolCommandCentreView({ data }: { data: SchoolCommandCentrePayload }) {
  const studentCount =
    data.kpis.find((k) => k.id === 'students')?.value ?? 0;

  return (
    <div className="school-ops-dashboard space-y-8">
      <SchoolCommandHero data={data} />
      <SchoolPeopleSetupPanel studentCount={studentCount} staffCount={data.staffCount} />
      <SchoolKpiBar kpis={data.kpis} />
      <SchoolInsightSnapshot insights={data.insightSnapshot} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SchoolHealthMap
          title="Year group health map"
          description="Colour-coded cohort performance — green stable, amber declining, red critical"
          cells={data.yearGroupHealth}
        />
        <SchoolHealthMap
          title="Subject / department pressure"
          description="Weakest areas requiring leadership attention"
          cells={data.subjectHealth}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SchoolRiskPanel alerts={data.riskAlerts} />
        </div>
        <SchoolInterventionPipeline pipeline={data.interventionPipeline} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SchoolTimeline events={data.timeline} />
        <SchoolAcuPanel acu={data.acu} />
      </div>

      <section className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/school/people">
            People management <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/school/reports">
            Executive reporting <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
