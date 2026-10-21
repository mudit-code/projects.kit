"use client";

import React, { useState } from "react";
import {
  FileText,
  FolderGit2,
  User,
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  SlidersHorizontal,
  Moon,
  Sun,
  Send,
  Trash2,
  Eye,
} from "lucide-react";
import {
  MobileShell,
} from "@/components/mobile/MobileShell";
import {
  StatusChip,
  ListRow,
  SegmentedControl,
  FilterPillBar,
  SearchField,
  BottomSheet,
  StickyActionBar,
  Stepper,
  FilePicker,
  PullToRefresh,
  SkeletonList,
  ConfirmDialog,
  DesktopOnlyCard,
  MobileTabItem,
} from "@/components/mobile/patterns";

export default function PatternsPreviewPage() {
  const [activeTab, setActiveTab] = useState("patterns");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<"all" | "pending" | "approved">("all");
  const [activePill, setActivePill] = useState("all");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRows, setSelectedRows] = useState<string[]>(["1"]);
  const [fileProgress, setFileProgress] = useState(0);
  const [fileStatus, setFileStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [refreshCount, setRefreshCount] = useState(0);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const sampleTabs: MobileTabItem[] = [
    { id: "forms", label: "Forms", icon: FileText, badge: 2, badgeColor: "blue" },
    { id: "patterns", label: "Patterns", icon: SlidersHorizontal },
    { id: "projects", label: "Projects", icon: FolderGit2 },
    { id: "account", label: "Account", icon: User },
  ];

  const handleSimulateUpload = () => {
    setFileStatus("uploading");
    setFileProgress(15);
    const interval = setInterval(() => {
      setFileProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setFileStatus("success");
          return 100;
        }
        return prev + 25;
      });
    }, 300);
  };

  const handlePullRefresh = async () => {
    await new Promise((r) => setTimeout(r, 1200));
    setRefreshCount((c) => c + 1);
  };

  const toggleRowSelect = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <MobileShell
        title="Mobile Pattern Library"
        subtitle="projects.kit native mobile design system"
        largeTitle={true}
        tabs={sampleTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerActions={
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        }
      >
        <PullToRefresh onRefresh={handlePullRefresh}>
          <div className="p-4 space-y-6 pb-28">
            {/* 1. Theme and Overview Notice */}
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 rounded-2xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0B2A6F] dark:text-blue-400 shrink-0" />
                <span>
                  <strong>Interactive Testbench</strong> (Pull down to refresh #{refreshCount})
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-white dark:bg-slate-800 rounded-md border border-blue-200 dark:border-slate-700">
                PWA Ready
              </span>
            </div>

            {/* 2. Status Chips */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                1. Status Chips
              </h2>
              <div className="flex flex-wrap gap-2">
                <StatusChip status="verified" />
                <StatusChip status="pending" />
                <StatusChip status="changes_requested" />
                <StatusChip status="rejected" />
                <StatusChip status="draft" />
                <StatusChip status="approved" size="sm" />
              </div>
            </section>

            {/* 3. Search Field */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                2. Search Field (16px+ prevents iOS zoom)
              </h2>
              <SearchField
                value={searchVal}
                onChange={setSearchVal}
                placeholder="Search projects, students, forms..."
              />
            </section>

            {/* 4. Segmented Control & Filter Pills */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                3. Segmented Control & Filter Bar
              </h2>
              <SegmentedControl
                options={[
                  { id: "all", label: "All Items", count: 18 },
                  { id: "pending", label: "Pending", count: 3 },
                  { id: "approved", label: "Approved", count: 15 },
                ]}
                value={selectedSegment}
                onChange={setSelectedSegment}
              />

              <FilterPillBar
                pills={[
                  { id: "all", label: "All Subjects", count: 18 },
                  { id: "bcs751", label: "Mini Project (BCS751)", count: 12 },
                  { id: "bcs851", label: "Major Project (BCS851)", count: 6 },
                  { id: "cs", label: "Dept: CSE", count: 14 },
                ]}
                activePill={activePill}
                onSelectPill={setActivePill}
              />
            </section>

            {/* 5. Stepper */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  4. Stepper Component
                </h2>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    disabled={currentStep === 0}
                    className="px-2 py-0.5 text-xs bg-neutral-200 dark:bg-slate-700 rounded-md disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => Math.min(2, s + 1))}
                    disabled={currentStep === 2}
                    className="px-2 py-0.5 text-xs bg-[#0B2A6F] text-white rounded-md disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 p-2">
                <Stepper
                  steps={[
                    { id: "verify", label: "Verification" },
                    { id: "details", label: "Project Info" },
                    { id: "confirm", label: "Review & Submit" },
                  ]}
                  currentStepIndex={currentStep}
                />
              </div>
            </section>

            {/* 6. List Rows (No Tables on Mobile!) */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                5. Two-Line List Rows with Selection
              </h2>
              <div className="rounded-2xl border border-neutral-200/90 dark:border-slate-800 overflow-hidden divide-y divide-neutral-100 dark:divide-slate-800">
                <ListRow
                  title="Aman Kumar"
                  subtitle="Roll: 2301330100024 • Project Nexus AI"
                  status="verified"
                  trailingMeta="Today"
                  selectable={true}
                  isSelected={selectedRows.includes("1")}
                  onSelect={() => toggleRowSelect("1")}
                  onClick={() => setIsSheetOpen(true)}
                />
                <ListRow
                  title="Priya Sharma"
                  subtitle="Roll: 2301330100088 • IoT Crop Monitor"
                  status="pending"
                  trailingMeta="2h ago"
                  selectable={true}
                  isSelected={selectedRows.includes("2")}
                  onSelect={() => toggleRowSelect("2")}
                  onClick={() => setIsSheetOpen(true)}
                />
                <ListRow
                  title="Vikram Rathore"
                  subtitle="Roll: 2301330100142 • Solar Tracking Rig"
                  status="changes_requested"
                  trailingMeta="Yesterday"
                  selectable={true}
                  isSelected={selectedRows.includes("3")}
                  onSelect={() => toggleRowSelect("3")}
                  onClick={() => setIsSheetOpen(true)}
                />
              </div>
            </section>


            {/* 8. File Picker */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  7. File Picker with Progress
                </h2>
                <button
                  type="button"
                  onClick={handleSimulateUpload}
                  className="text-xs font-bold text-[#0B2A6F] dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Simulate Upload
                </button>
              </div>
              <FilePicker
                label="Synopsis / Report PDF"
                progress={fileProgress}
                status={fileStatus}
                onFileSelect={handleSimulateUpload}
                onFileRemove={() => {
                  setFileStatus("idle");
                  setFileProgress(0);
                }}
              />
            </section>

            {/* 9. Skeleton Loading */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                8. Skeleton Loading States
              </h2>
              <div className="rounded-2xl border border-neutral-200/90 dark:border-slate-800 overflow-hidden">
                <SkeletonList count={2} />
              </div>
            </section>

            {/* 10. Modals & Actions Triggers */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                9. Bottom Sheet & Confirmation Dialog
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsSheetOpen(true)}
                  className="min-h-[44px] px-4 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs active:scale-98 cursor-pointer"
                >
                  Open Bottom Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(true)}
                  className="min-h-[44px] px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-700 dark:text-rose-300 shadow-xs active:scale-98 cursor-pointer"
                >
                  Open Confirm Dialog
                </button>
              </div>
            </section>

            {/* 11. Desktop Only Notice Card */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                10. Desktop-Only Fallback Card
              </h2>
              <DesktopOnlyCard
                featureName="CSV Batch Import & Department Archives"
                description="Complex spreadsheet mapping and multi-file zip extractions are optimized for desktop keyboards and large displays."
              />
            </section>
          </div>
        </PullToRefresh>

        {/* Interactive Bottom Sheet */}
        <BottomSheet
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          title="Submission Details"
          description="Aman Kumar • Roll: 2301330100024"
        >
          <div className="space-y-4 py-2">
            <div className="p-3.5 bg-neutral-50 dark:bg-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Project Title</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Nexus AI Smart Traffic
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Guide</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Dr. A. Sharma
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <StatusChip status="verified" size="sm" />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="w-full min-h-[44px] rounded-xl bg-[#0B2A6F] text-white text-xs font-bold active:scale-98 cursor-pointer"
              >
                Approve Submission
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSheetOpen(false);
                  setIsConfirmOpen(true);
                }}
                className="w-full min-h-[44px] rounded-xl border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-98 cursor-pointer"
              >
                Request Revisions
              </button>
            </div>
          </div>
        </BottomSheet>

        {/* Destructive Confirmation Dialog */}
        <ConfirmDialog
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          title="Request Project Revisions?"
          description="The student will receive an instant notification to update their synopsis according to your feedback."
          confirmLabel="Send Revision Request"
          cancelLabel="Keep Current Status"
          isDestructive={true}
          onConfirm={() => {
            setIsConfirmOpen(false);
          }}
        />

        {/* Sticky Action Bar */}
        <StickyActionBar
          primaryLabel="Apply Filter Selection"
          onPrimaryClick={() => {
            alert(`Selected ${selectedRows.length} items on filter "${activePill}"`);
          }}
          secondaryLabel="Clear"
          onSecondaryClick={() => setSelectedRows([])}
          extra={
            selectedRows.length > 0 ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
                <span>{selectedRows.length} row(s) selected</span>
                <span className="font-semibold text-[#0B2A6F] dark:text-blue-400">Batch ready</span>
              </div>
            ) : null
          }
        />
      </MobileShell>
    </div>
  );
}
