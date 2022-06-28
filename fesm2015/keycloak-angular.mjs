import { __awaiter } from 'tslib';
import * as i0 from '@angular/core';
import { Injectable, NgModule } from '@angular/core';
import { HttpHeaders, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Subject, from, combineLatest } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import Keycloak from 'keycloak-js';
import { CommonModule } from '@angular/common';

var KeycloakEventType;
(function (KeycloakEventType) {
    KeycloakEventType[KeycloakEventType["OnAuthError"] = 0] = "OnAuthError";
    KeycloakEventType[KeycloakEventType["OnAuthLogout"] = 1] = "OnAuthLogout";
    KeycloakEventType[KeycloakEventType["OnAuthRefreshError"] = 2] = "OnAuthRefreshError";
    KeycloakEventType[KeycloakEventType["OnAuthRefreshSuccess"] = 3] = "OnAuthRefreshSuccess";
    KeycloakEventType[KeycloakEventType["OnAuthSuccess"] = 4] = "OnAuthSuccess";
    KeycloakEventType[KeycloakEventType["OnReady"] = 5] = "OnReady";
    KeycloakEventType[KeycloakEventType["OnTokenExpired"] = 6] = "OnTokenExpired";
    KeycloakEventType[KeycloakEventType["OnActionUpdate"] = 7] = "OnActionUpdate";
})(KeycloakEventType || (KeycloakEventType = {}));

class KeycloakAuthGuard {
    constructor(router, keycloakAngular) {
        this.router = router;
        this.keycloakAngular = keycloakAngular;
    }
    canActivate(route, state) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.authenticated = yield this.keycloakAngular.isLoggedIn();
                this.roles = yield this.keycloakAngular.getUserRoles(true);
                return yield this.isAccessAllowed(route, state);
            }
            catch (error) {
                throw new Error('An error happened during access validation. Details:' + error);
            }
        });
    }
}

class KeycloakService {
    constructor() {
        this._keycloakEvents$ = new Subject();
    }
    bindsKeycloakEvents() {
        this._instance.onAuthError = (errorData) => {
            this._keycloakEvents$.next({
                args: errorData,
                type: KeycloakEventType.OnAuthError
            });
        };
        this._instance.onAuthLogout = () => {
            this._keycloakEvents$.next({ type: KeycloakEventType.OnAuthLogout });
        };
        this._instance.onAuthRefreshSuccess = () => {
            this._keycloakEvents$.next({
                type: KeycloakEventType.OnAuthRefreshSuccess
            });
        };
        this._instance.onAuthRefreshError = () => {
            this._keycloakEvents$.next({
                type: KeycloakEventType.OnAuthRefreshError
            });
        };
        this._instance.onAuthSuccess = () => {
            this._keycloakEvents$.next({ type: KeycloakEventType.OnAuthSuccess });
        };
        this._instance.onTokenExpired = () => {
            this._keycloakEvents$.next({
                type: KeycloakEventType.OnTokenExpired
            });
        };
        this._instance.onActionUpdate = (state) => {
            this._keycloakEvents$.next({
                args: state,
                type: KeycloakEventType.OnActionUpdate
            });
        };
        this._instance.onReady = (authenticated) => {
            this._keycloakEvents$.next({
                args: authenticated,
                type: KeycloakEventType.OnReady
            });
        };
    }
    loadExcludedUrls(bearerExcludedUrls) {
        const excludedUrls = [];
        for (const item of bearerExcludedUrls) {
            let excludedUrl;
            if (typeof item === 'string') {
                excludedUrl = { urlPattern: new RegExp(item, 'i'), httpMethods: [] };
            }
            else {
                excludedUrl = {
                    urlPattern: new RegExp(item.url, 'i'),
                    httpMethods: item.httpMethods
                };
            }
            excludedUrls.push(excludedUrl);
        }
        return excludedUrls;
    }
    initServiceValues({ enableBearerInterceptor = true, loadUserProfileAtStartUp = false, bearerExcludedUrls = [], authorizationHeaderName = 'Authorization', bearerPrefix = 'Bearer', initOptions, updateMinValidity = 20, shouldAddToken = () => true, shouldUpdateToken = () => true }) {
        this._enableBearerInterceptor = enableBearerInterceptor;
        this._loadUserProfileAtStartUp = loadUserProfileAtStartUp;
        this._authorizationHeaderName = authorizationHeaderName;
        this._bearerPrefix = bearerPrefix.trim().concat(' ');
        this._excludedUrls = this.loadExcludedUrls(bearerExcludedUrls);
        this._silentRefresh = initOptions ? initOptions.flow === 'implicit' : false;
        this._updateMinValidity = updateMinValidity;
        this.shouldAddToken = shouldAddToken;
        this.shouldUpdateToken = shouldUpdateToken;
    }
    init(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initServiceValues(options);
            const { config, initOptions } = options;
            this._instance = Keycloak(config);
            this.bindsKeycloakEvents();
            const authenticated = yield this._instance.init(initOptions);
            if (authenticated && this._loadUserProfileAtStartUp) {
                yield this.loadUserProfile();
            }
            return authenticated;
        });
    }
    login(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._instance.login(options);
            if (this._loadUserProfileAtStartUp) {
                yield this.loadUserProfile();
            }
        });
    }
    logout(redirectUri) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                redirectUri
            };
            yield this._instance.logout(options);
            this._userProfile = undefined;
        });
    }
    register(options = { action: 'register' }) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._instance.register(options);
        });
    }
    isUserInRole(role, resource) {
        let hasRole;
        hasRole = this._instance.hasResourceRole(role, resource);
        if (!hasRole) {
            hasRole = this._instance.hasRealmRole(role);
        }
        return hasRole;
    }
    getUserRoles(allRoles = true) {
        let roles = [];
        if (this._instance.resourceAccess) {
            for (const key in this._instance.resourceAccess) {
                if (this._instance.resourceAccess.hasOwnProperty(key)) {
                    const resourceAccess = this._instance.resourceAccess[key];
                    const clientRoles = resourceAccess['roles'] || [];
                    roles = roles.concat(clientRoles);
                }
            }
        }
        if (allRoles && this._instance.realmAccess) {
            const realmRoles = this._instance.realmAccess['roles'] || [];
            roles.push(...realmRoles);
        }
        return roles;
    }
    isLoggedIn() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._instance.authenticated;
        });
    }
    isTokenExpired(minValidity = 0) {
        return this._instance.isTokenExpired(minValidity);
    }
    updateToken(minValidity = this._updateMinValidity) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._silentRefresh) {
                    if (this.isTokenExpired()) {
                        throw new Error('Failed to refresh the token, or the session is expired');
                    }
                    return true;
                }
                if (!this._instance) {
                    throw new Error('Keycloak Angular library is not initialized.');
                }
                return yield this._instance.updateToken(minValidity);
            }
            catch (error) {
                return false;
            }
        });
    }
    loadUserProfile(forceReload = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._userProfile && !forceReload) {
                return this._userProfile;
            }
            if (!this._instance.authenticated) {
                throw new Error('The user profile was not loaded as the user is not logged in.');
            }
            return (this._userProfile = yield this._instance.loadUserProfile());
        });
    }
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._instance.token;
        });
    }
    getUsername() {
        if (!this._userProfile) {
            throw new Error('User not logged in or user profile was not loaded.');
        }
        return this._userProfile.username;
    }
    clearToken() {
        this._instance.clearToken();
    }
    addTokenToHeader(headers = new HttpHeaders()) {
        return from(this.getToken()).pipe(map((token) => token
            ? headers.set(this._authorizationHeaderName, this._bearerPrefix + token)
            : headers));
    }
    getKeycloakInstance() {
        return this._instance;
    }
    get excludedUrls() {
        return this._excludedUrls;
    }
    get enableBearerInterceptor() {
        return this._enableBearerInterceptor;
    }
    get keycloakEvents$() {
        return this._keycloakEvents$;
    }
}
KeycloakService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: KeycloakService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
KeycloakService.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: KeycloakService });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: KeycloakService, decorators: [{
            type: Injectable
        }] });

class KeycloakBearerInterceptor {
    constructor(keycloak) {
        this.keycloak = keycloak;
    }
    conditionallyUpdateToken(req) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.keycloak.shouldUpdateToken(req)) {
                return yield this.keycloak.updateToken();
            }
            return true;
        });
    }
    isUrlExcluded({ method, url }, { urlPattern, httpMethods }) {
        const httpTest = httpMethods.length === 0 ||
            httpMethods.join().indexOf(method.toUpperCase()) > -1;
        const urlTest = urlPattern.test(url);
        return httpTest && urlTest;
    }
    intercept(req, next) {
        const { enableBearerInterceptor, excludedUrls } = this.keycloak;
        if (!enableBearerInterceptor) {
            return next.handle(req);
        }
        const shallPass = !this.keycloak.shouldAddToken(req) ||
            excludedUrls.findIndex((item) => this.isUrlExcluded(req, item)) > -1;
        if (shallPass) {
            return next.handle(req);
        }
        return combineLatest([
            this.conditionallyUpdateToken(req),
            this.keycloak.isLoggedIn()
        ]).pipe(mergeMap(([_, isLoggedIn]) => isLoggedIn
            ? this.handleRequestWithTokenHeader(req, next)
            : next.handle(req)));
    }
    handleRequestWithTokenHeader(req, next) {
        return this.keycloak.addTokenToHeader(req.headers).pipe(mergeMap((headersWithBearer) => {
            const kcReq = req.clone({ headers: headersWithBearer });
            return next.handle(kcReq);
        }));
    }
}
KeycloakBearerInterceptor.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: KeycloakBearerInterceptor, deps: [{ token: KeycloakService }], target: i0.ɵɵFactoryTarget.Injectable });
KeycloakBearerInterceptor.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: KeycloakBearerInterceptor });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: KeycloakBearerInterceptor, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: KeycloakService }]; } });

class CoreModule {
}
CoreModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: CoreModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
CoreModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "14.0.3", ngImport: i0, type: CoreModule, imports: [CommonModule] });
CoreModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: CoreModule, providers: [
        KeycloakService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: KeycloakBearerInterceptor,
            multi: true
        }
    ], imports: [CommonModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: CoreModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [CommonModule],
                    providers: [
                        KeycloakService,
                        {
                            provide: HTTP_INTERCEPTORS,
                            useClass: KeycloakBearerInterceptor,
                            multi: true
                        }
                    ]
                }]
        }] });

class KeycloakAngularModule {
}
KeycloakAngularModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: KeycloakAngularModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
KeycloakAngularModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "14.0.3", ngImport: i0, type: KeycloakAngularModule, imports: [CoreModule] });
KeycloakAngularModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: KeycloakAngularModule, imports: [CoreModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.3", ngImport: i0, type: KeycloakAngularModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [CoreModule]
                }]
        }] });

export { CoreModule, KeycloakAngularModule, KeycloakAuthGuard, KeycloakBearerInterceptor, KeycloakEventType, KeycloakService };
//# sourceMappingURL=keycloak-angular.mjs.map
