type NotionDataSourceResolverClient = {
    dataSources: {
        retrieve(args: { data_source_id: string }): Promise<unknown>;
    };
    databases: {
        retrieve(args: { database_id: string }): Promise<unknown>;
    };
};

export type NotionDataSource<TProperty> = {
    object: "data_source";
    id: string;
    properties: Record<string, TProperty>;
    title?: Array<{ plain_text?: string }>;
};

export function getStatusCodeFromError(error: unknown): number | null {
    if (!(error instanceof Error)) {
        return null;
    }

    const match = error.message.match(/(?:API error|Notion API error|Semantic Scholar API error):\s*(\d{3})\b/i);
    if (!match?.[1]) {
        return null;
    }

    const status = Number(match[1]);
    return Number.isInteger(status) ? status : null;
}

function isNotionDataSource<TProperty>(value: unknown): value is NotionDataSource<TProperty> {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return candidate.object === "data_source"
        && typeof candidate.id === "string"
        && typeof candidate.properties === "object"
        && candidate.properties !== null;
}

function getFirstDataSourceIdFromDatabase(value: unknown): string | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    const candidate = value as Record<string, unknown>;
    if (candidate.object !== "database" || !Array.isArray(candidate.data_sources)) {
        return null;
    }

    const firstDataSource = candidate.data_sources[0];
    if (typeof firstDataSource !== "object" || firstDataSource === null) {
        return null;
    }

    const id = (firstDataSource as Record<string, unknown>).id;
    return typeof id === "string" ? id : null;
}

export async function resolveNotionDataSource<TProperty>(
    notion: NotionDataSourceResolverClient,
    databaseId: string,
): Promise<NotionDataSource<TProperty>> {
    try {
        const dataSource = await notion.dataSources.retrieve({ data_source_id: databaseId });
        if (isNotionDataSource<TProperty>(dataSource)) {
            return dataSource;
        }
    } catch (error) {
        const status = getStatusCodeFromError(error);
        if (status !== null && status !== 400 && status !== 404) {
            throw error;
        }
    }

    const database = await notion.databases.retrieve({ database_id: databaseId });
    const firstDataSourceId = getFirstDataSourceIdFromDatabase(database);
    if (!firstDataSourceId) {
        throw new Error("No data source found in selected database");
    }

    const fallbackDataSource = await notion.dataSources.retrieve({ data_source_id: firstDataSourceId });
    if (!isNotionDataSource<TProperty>(fallbackDataSource)) {
        throw new Error("Data source not found");
    }

    return fallbackDataSource;
}
