# Project File Structure

This project is a Next.js app using the App Router. Below is a simple guide to the main folders and files.

## Top-level

- app/: The Next.js App Router pages, layouts, and global styles.
- components/: Reusable UI components.
- hooks/: Custom React hooks.
- lib/: Shared utilities and helpers.
- public/: Static assets served as-is.
- components.json: UI component tooling/configuration.
- eslint.config.mjs: Linting configuration.
- next-env.d.ts: Next.js TypeScript types.
- next.config.ts: Next.js configuration.
- package.json / package-lock.json: Dependencies and scripts.
- postcss.config.mjs: PostCSS configuration.
- tsconfig.json: TypeScript configuration.
- README.md: Project overview.

## app/

- globals.css: Global styles.
- layout.tsx: Root layout for the app.
- page.tsx: Home page route.
- favicon.ico: Site icon (also present in public).

## components/

- ui/: A library of prebuilt UI components.
  - accordion.tsx
  - alert-dialog.tsx
  - alert.tsx
  - aspect-ratio.tsx
  - avatar.tsx
  - badge.tsx
  - breadcrumb.tsx
  - button-group.tsx
  - button.tsx
  - calendar.tsx
  - card.tsx
  - carousel.tsx
  - chart.tsx
  - checkbox.tsx
  - collapsible.tsx
  - command.tsx
  - context-menu.tsx
  - dialog.tsx
  - drawer.tsx
  - dropdown-menu.tsx
  - empty.tsx
  - field.tsx
  - form.tsx
  - hover-card.tsx
  - input-group.tsx
  - input-otp.tsx
  - input.tsx
  - item.tsx
  - kbd.tsx
  - label.tsx
  - menubar.tsx
  - navigation-menu.tsx
  - pagination.tsx
  - popover.tsx
  - progress.tsx
  - radio-group.tsx
  - resizable.tsx
  - scroll-area.tsx
  - select.tsx
  - separator.tsx
  - sheet.tsx
  - sidebar.tsx
  - skeleton.tsx
  - slider.tsx
  - sonner.tsx
  - spinner.tsx
  - switch.tsx
  - table.tsx
  - tabs.tsx
  - textarea.tsx
  - toggle-group.tsx
  - toggle.tsx
  - tooltip.tsx

## hooks/

- use-mobile.ts: Hook for responsive/mobile checks.

## lib/

- utils.ts: Shared utility functions.

## public/

- prettiflow.svg: Public static asset.
