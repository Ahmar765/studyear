

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPendingResourcesAction, type UploadedResource } from "@/server/actions/admin-actions";
import ResourcePipelineManager from "./resource-pipeline-manager";
import { getSubjects, getLevels } from "@/server/actions/academic-actions";


export default async function AdminContentPage() {
  const pendingResources = await getPendingResourcesAction();
  const subjects = await getSubjects();
  const levels = await getLevels();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Content Management</h2>
                <p className="text-muted-foreground">
                    Manage subjects, topics, and curate external video resources.
                </p>
            </div>
        </div>
        
        <ResourcePipelineManager 
            initialResources={pendingResources.resources as UploadedResource[]} 
            subjects={subjects}
            levels={levels}
        />
    </div>
  );
}
