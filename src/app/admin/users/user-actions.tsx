
'use client';

import { useTransition, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Loader, Link2, Building, Fuel } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/firebase/services/user';
import EditUserForm from './edit-user-form';
import LinkParentForm from './link-parent-form';
import ImpersonationDialog from './impersonation-dialog';
import LinkSchoolForm from './link-school-form';
import AcuAdjustmentDialog from './acu-adjustment-dialog';


export default function UserActions({ user }: { user: UserProfile }) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isImpersonateOpen, setIsImpersonateOpen] = useState(false);
    const [isLinkParentOpen, setIsLinkParentOpen] = useState(false);
    const [isLinkSchoolOpen, setIsLinkSchoolOpen] = useState(false);
    const [isAcuAdjustOpen, setIsAcuAdjustOpen] = useState(false);

    return (
        <div className="flex flex-wrap gap-2 justify-end">
             <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                </DialogTrigger>
                <EditUserForm user={user} onUpdateSuccess={() => setIsEditOpen(false)} />
            </Dialog>

             {user.role === 'STUDENT' && (
                 <Dialog open={isLinkParentOpen} onOpenChange={setIsLinkParentOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Link2 className="mr-2 h-4 w-4" /> Link Parent
                        </Button>
                    </DialogTrigger>
                    <LinkParentForm student={user} onLinkSuccess={() => setIsLinkParentOpen(false)} />
                </Dialog>
            )}

            {user.role === 'STUDENT' && (
                 <Dialog open={isLinkSchoolOpen} onOpenChange={setIsLinkSchoolOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Building className="mr-2 h-4 w-4" /> Link School
                        </Button>
                    </DialogTrigger>
                    <LinkSchoolForm student={user} onLinkSuccess={() => setIsLinkSchoolOpen(false)} />
                </Dialog>
            )}
            
            <Dialog open={isAcuAdjustOpen} onOpenChange={setIsAcuAdjustOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Fuel className="mr-2 h-4 w-4" /> Adjust ACUs
                    </Button>
                </DialogTrigger>
                <AcuAdjustmentDialog user={user} onSuccess={() => setIsAcuAdjustOpen(false)} />
            </Dialog>

            <Dialog open={isImpersonateOpen} onOpenChange={setIsImpersonateOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                        <Eye className="mr-2 h-4 w-4" /> View as User
                    </Button>
                </DialogTrigger>
                <ImpersonationDialog user={user} onSessionStart={() => setIsImpersonateOpen(false)} />
            </Dialog>
        </div>
    );
}
