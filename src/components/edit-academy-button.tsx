'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';

type EditAcademyButtonProps = {
  academyId: string;
};

export function EditAcademyButton({ academyId }: EditAcademyButtonProps) {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const handleEditClick = () => {
    router.push(`/admin/academies/${academyId}/edit`);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleEditClick}
      className="shrink-0 bg-background/90 text-foreground hover:bg-background"
    >
      <Edit className="h-4 w-4" />
      <span className="sr-only">Editar Academia</span>
    </Button>
  );
}
