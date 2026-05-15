'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAction } from '@/server/actions/admin-actions';
import { UserProfile } from '@/lib/firebase/services/user';
import { useAuth } from '@/hooks/use-auth';
import { Loader, Trash2 } from 'lucide-react';

export default function DeleteUserDialog({
  user,
  onDeleted,
}: {
  user: UserProfile;
  onDeleted?: () => void;
}) {
  const { user: admin } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm !== user.email) {
      toast({
        variant: 'destructive',
        title: 'Confirmation required',
        description: 'Type the user email exactly to confirm deletion.',
      });
      return;
    }
    startTransition(async () => {
      const token = await admin?.getIdToken();
      const result = await deleteUserAction(user.uid, token);
      if (result.success) {
        toast({ title: 'User deleted', description: `${user.email} has been removed.` });
        setOpen(false);
        setConfirm('');
        onDeleted?.();
      } else {
        toast({ variant: 'destructive', title: 'Delete failed', description: result.error });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete user permanently</DialogTitle>
          <DialogDescription>
            This removes {user.name} ({user.email}) from Firebase Auth and Firestore. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-email">Type {user.email} to confirm</Label>
          <Input
            id="confirm-email"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={user.email}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete user'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
