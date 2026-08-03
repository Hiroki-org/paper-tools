"use client";

import { AvailableDatabases } from "./components/AvailableDatabases";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { ManualDatabaseForm } from "./components/ManualDatabaseForm";
import { PropertyWarnings } from "./components/PropertyWarnings";
import { SetupHeader } from "./components/SetupHeader";
import { useSetupPage } from "./hooks/useSetupPage";

export default function SetupPage() {
	const {
		items,
		loading,
		selectingId,
		manualDatabaseId,
		setManualDatabaseId,
		error,
		warnings,
		showWarnings,
		handleManualSubmit,
		handleContinue,
		selectDatabase,
	} = useSetupPage();

	return (
		<div className="space-y-10">
			<SetupHeader />

			<ManualDatabaseForm
				manualDatabaseId={manualDatabaseId}
				setManualDatabaseId={setManualDatabaseId}
				selectingId={selectingId}
				handleManualSubmit={handleManualSubmit}
			/>

			<ErrorDisplay error={error} />

			<PropertyWarnings
				warnings={warnings}
				showWarnings={showWarnings}
				handleContinue={handleContinue}
			/>

			<AvailableDatabases
				items={items}
				loading={loading}
				selectingId={selectingId}
				selectDatabase={selectDatabase}
			/>
		</div>
	);
}
