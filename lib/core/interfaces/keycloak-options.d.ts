import { HttpRequest } from '@angular/common/http';
export declare type HttpMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'PATCH';
export interface ExcludedUrl {
    url: string;
    httpMethods?: HttpMethods[];
}
export interface ExcludedUrlRegex {
    urlPattern: RegExp;
    httpMethods?: HttpMethods[];
}
export interface KeycloakOptions {
    config?: string | Keycloak.KeycloakConfig;
    initOptions?: Keycloak.KeycloakInitOptions;
    enableBearerInterceptor?: boolean;
    loadUserProfileAtStartUp?: boolean;
    bearerExcludedUrls?: (string | ExcludedUrl)[];
    authorizationHeaderName?: string;
    bearerPrefix?: string;
    updateMinValidity?: number;
    shouldAddToken?: (request: HttpRequest<unknown>) => boolean;
    shouldUpdateToken?: (request: HttpRequest<unknown>) => boolean;
}
