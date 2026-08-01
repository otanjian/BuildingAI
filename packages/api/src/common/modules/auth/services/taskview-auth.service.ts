import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

export interface TaskviewSession {
    taskviewToken: string;
    taskviewOrgSlug: string;
}

/**
 * Service to obtain Taskview session tokens via platform-sso and fetch
 * the user's first organization slug.
 */
@Injectable()
export class TaskviewAuthService {
    private readonly logger = new Logger(TaskviewAuthService.name);

    constructor(private readonly httpService: HttpService) {}

    /**
     * Obtain a Taskview access token for the given username via platform-sso,
     * then fetch the first organization slug for the user.
     */
    async getSession(username: string): Promise<TaskviewSession | null> {
        try {
            const taskviewBaseUrl = process.env.TASKVIEW_API_URL || "http://localhost:8080";
            const ssoSecret = process.env.TASKVIEW_SSO_SECRET;

            if (!ssoSecret) {
                this.logger.warn("TASKVIEW_SSO_SECRET is not configured, skipping Taskview session creation");
                return null;
            }

            // Step 1: Get Taskview tokens via platform-sso
            const ssoResponse = await firstValueFrom(
                this.httpService.post<{
                    access: string;
                    refresh: string;
                }>(`${taskviewBaseUrl}/module/auth/platform-sso`, {
                    username,
                    secret: ssoSecret,
                }),
            );

            const { access } = ssoResponse.data;
            if (!access) {
                this.logger.error("Taskview platform-sso returned no access token");
                return null;
            }

            // Step 2: Fetch user's organizations to get orgSlug
            const orgsResponse = await firstValueFrom(
                this.httpService.get<Array<{ slug: string }>>(
                    `${taskviewBaseUrl}/module/organizations`,
                    {
                        headers: { Authorization: `Bearer ${access}` },
                    },
                ),
            );

            const orgs = orgsResponse.data?.response ?? orgsResponse.data;
            const orgSlug = Array.isArray(orgs) ? orgs?.[0]?.slug || "" : "";

            if (!orgSlug) {
                this.logger.warn(`Taskview user ${username} has no organizations`);
                return null;
            }

            return {
                taskviewToken: access,
                taskviewOrgSlug: orgSlug,
            };
        } catch (error) {
            this.logger.error(`Failed to get Taskview session for user ${username}:`, error);
            return null;
        }
    }
}
