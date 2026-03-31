import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const Index = () => {
  const [activeTab, setActiveTab] = useState("mirror");

  return (
    <AppLayout showNav={false}>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="font-display text-4xl font-light text-foreground">
            Aethel Mirror
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            Decision clarity is loading…
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
