
'use client';

import { BarChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart as BarChartIcon } from 'lucide-react';

const chartConfig = {
  users: {
    label: "New Users",
    color: "hsl(var(--primary))",
  },
  hours: {
    label: "Avg. Hours",
    color: "hsl(var(--accent))",
  }
};

export default function AnalyticsCharts({
  newUsersData,
  studyTimeData = [],
}: {
  newUsersData: { month: string; users: number }[];
  studyTimeData?: { week: string; hours: number }[];
}) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>New Users This Year</CardTitle>
                </CardHeader>
                 <CardContent className="pl-2 h-[300px]">
                    {newUsersData.length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-[260px] w-full">
                            <BarChart accessibilityLayer data={newUsersData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                />
                                <YAxis />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="dot" />}
                                />
                                <Bar dataKey="users" fill="var(--color-users)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <BarChartIcon className="h-10 w-10 mb-2" />
                            <p>No new user data to display.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Avg. Study Time / Week (Hours)</CardTitle>
                </CardHeader>
                 <CardContent className="pl-2 h-[300px]">
                     {studyTimeData.length > 0 ? (
                         <ChartContainer config={chartConfig} className="h-[260px] w-full">
                            <LineChart
                                accessibilityLayer
                                data={studyTimeData}
                                margin={{
                                    left: 12,
                                    right: 12,
                                }}
                                >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="week"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="dot" />}
                                />
                                <Line
                                    dataKey="hours"
                                    type="monotone"
                                    stroke="var(--color-hours)"
                                    strokeWidth={2}
                                    dot={true}
                                />
                            </LineChart>
                        </ChartContainer>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <BarChartIcon className="h-10 w-10 mb-2" />
                            <p>No completed study sessions in the last 8 weeks yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

