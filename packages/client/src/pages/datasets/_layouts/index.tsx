import { useSidebar } from "@buildingai/ui/components/ui/sidebar";
import { useLayoutEffect, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";

import { DatasetEditDialog } from "../detail/_components/dialogs/dataset-edit-dialog";
import { DatasetsNavbar } from "./navbar";
import { DatasetsSidebar } from "./sidebar";

const KnowledgeLayout = () => {
  const { setTemporaryOpen } = useSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const embedMode = searchParams.get("_embed") === "1";
  const wantCreate = searchParams.get("create") === "1";
  const [createOpen, setCreateOpen] = useState(wantCreate);

  useLayoutEffect(() => {
    setTemporaryOpen(false);
    return () => setTemporaryOpen(null);
  }, [setTemporaryOpen]);

  useLayoutEffect(() => {
    if (wantCreate) setCreateOpen(true);
  }, [wantCreate]);

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open && wantCreate) {
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <div className="flex h-full min-h-0">
      {!embedMode && <DatasetsSidebar />}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!embedMode && <DatasetsNavbar />}
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
      {createOpen && <DatasetEditDialog mode="create" open onOpenChange={handleCreateOpenChange} />}
    </div>
  );
};

export default KnowledgeLayout;
