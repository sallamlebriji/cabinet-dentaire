-- CreateTable
CREATE TABLE `clinics` (
    `id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NULL,
    `city` VARCHAR(80) NULL,
    `address` VARCHAR(255) NULL,
    `phone` VARCHAR(40) NULL,
    `chairs` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(40) NOT NULL,
    `first` VARCHAR(80) NULL,
    `last` VARCHAR(80) NULL,
    `title` VARCHAR(10) NULL,
    `role` VARCHAR(20) NOT NULL,
    `is_admin` BOOLEAN NULL DEFAULT false,
    `spec` VARCHAR(120) NULL,
    `clinic_id` VARCHAR(40) NULL,
    `chair` VARCHAR(40) NULL,
    `color` VARCHAR(10) NULL,
    `email` VARCHAR(160) NOT NULL,
    `phone` VARCHAR(40) NULL,
    `password_hash` VARCHAR(100) NULL,
    `twofa_enabled` BOOLEAN NULL DEFAULT false,
    `twofa_secret` VARCHAR(64) NULL,
    `active` BOOLEAN NULL DEFAULT true,
    `last_login_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role` VARCHAR(20) NOT NULL,
    `label` VARCHAR(60) NULL,
    `perms` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(40) NOT NULL,
    `kind` VARCHAR(10) NULL DEFAULT 'staff',
    `user_id` VARCHAR(40) NULL,
    `patient_id` VARCHAR(40) NULL,
    `ip` VARCHAR(64) NULL,
    `user_agent` VARCHAR(255) NULL,
    `last_seen_at` DATETIME(0) NULL,
    `revoked_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `key` VARCHAR(60) NOT NULL,
    `value` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `acts` (
    `code` VARCHAR(12) NOT NULL,
    `label` VARCHAR(120) NULL,
    `price` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `counters` (
    `key` VARCHAR(20) NOT NULL,
    `value` INTEGER NULL DEFAULT 0,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patients` (
    `id` VARCHAR(40) NOT NULL,
    `first` VARCHAR(80) NULL,
    `last` VARCHAR(80) NULL,
    `sex` VARCHAR(1) NULL,
    `dob` DATE NULL,
    `profession` VARCHAR(120) NULL,
    `clinic_id` VARCHAR(40) NULL,
    `phone` VARCHAR(40) NULL,
    `email` VARCHAR(160) NULL,
    `address` VARCHAR(255) NULL,
    `emergency` LONGTEXT NULL,
    `cover` VARCHAR(60) NULL,
    `cover_no` VARCHAR(40) NULL,
    `file_no` VARCHAR(20) NULL,
    `history` LONGTEXT NULL,
    `allergies` LONGTEXT NULL,
    `meds` LONGTEXT NULL,
    `smoker` BOOLEAN NULL DEFAULT false,
    `dentist_id` VARCHAR(40) NULL,
    `tags` LONGTEXT NULL,
    `created_on` DATE NULL,
    `avatar` VARCHAR(10) NULL,
    `notes` TEXT NULL,
    `no_shows` INTEGER NULL DEFAULT 0,
    `late_count` INTEGER NULL DEFAULT 0,
    `reinforced` BOOLEAN NULL DEFAULT false,
    `consent` LONGTEXT NULL,
    `source` VARCHAR(40) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `patients_clinic_id`(`clinic_id`),
    INDEX `patients_last_first`(`last`, `first`),
    INDEX `patients_phone`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `dentist_id` VARCHAR(40) NULL,
    `clinic_id` VARCHAR(40) NULL,
    `chair` VARCHAR(40) NULL,
    `date` DATE NULL,
    `start` VARCHAR(5) NULL,
    `dur` INTEGER NULL DEFAULT 30,
    `type` VARCHAR(20) NULL,
    `status` VARCHAR(12) NULL,
    `note` VARCHAR(500) NULL,
    `late` INTEGER NULL DEFAULT 0,
    `moved` BOOLEAN NULL DEFAULT false,
    `source` VARCHAR(12) NULL DEFAULT 'cabinet',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `appointments_date_clinic_id`(`date`, `clinic_id`),
    INDEX `appointments_dentist_id_date`(`dentist_id`, `date`),
    INDEX `appointments_patient_id`(`patient_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consultations` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `dentist_id` VARCHAR(40) NULL,
    `date` DATE NULL,
    `appt_id` VARCHAR(40) NULL,
    `type` VARCHAR(20) NULL,
    `motif` VARCHAR(255) NULL,
    `anamnese` TEXT NULL,
    `history` TEXT NULL,
    `allergies` TEXT NULL,
    `observations` TEXT NULL,
    `diagnosis` TEXT NULL,
    `proposed` TEXT NULL,
    `done` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `consultations_patient_id_date`(`patient_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `odonto_charts` (
    `patient_id` VARCHAR(40) NOT NULL,
    `teeth` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`patient_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `odonto_histories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `patient_id` VARCHAR(40) NULL,
    `date` DATE NULL,
    `user` VARCHAR(120) NULL,
    `tooth` VARCHAR(4) NULL,
    `layer` VARCHAR(10) NULL,
    `cond` VARCHAR(20) NULL,
    `action` VARCHAR(12) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `odonto_histories_patient_id`(`patient_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `dentist_id` VARCHAR(40) NULL,
    `title` VARCHAR(160) NULL,
    `created_on` DATE NULL,
    `status` VARCHAR(12) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_items` (
    `id` VARCHAR(40) NOT NULL,
    `plan_id` VARCHAR(40) NULL,
    `label` VARCHAR(160) NULL,
    `tooth` VARCHAR(20) NULL,
    `price` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `status` VARCHAR(12) NULL,
    `planned` DATE NULL,
    `done` DATE NULL,
    `paid` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `invoiced` BOOLEAN NULL DEFAULT false,
    `position` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `plan_id`(`plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ortho_cases` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `dentist_id` VARCHAR(40) NULL,
    `appliance` VARCHAR(120) NULL,
    `start` DATE NULL,
    `months` INTEGER NULL DEFAULT 12,
    `current` INTEGER NULL DEFAULT 0,
    `fee` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `paid` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `stage` VARCHAR(120) NULL,
    `steps` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prescriptions` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `dentist_id` VARCHAR(40) NULL,
    `date` DATE NULL,
    `items` LONGTEXT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `kind` VARCHAR(20) NULL,
    `title` VARCHAR(200) NULL,
    `date` DATE NULL,
    `cat` VARCHAR(20) NULL,
    `seed` INTEGER NULL DEFAULT 1,
    `shared` BOOLEAN NULL DEFAULT false,
    `consult` VARCHAR(160) NULL,
    `from_portal` BOOLEAN NULL DEFAULT false,
    `reviewed` BOOLEAN NULL DEFAULT true,
    `file_path` VARCHAR(255) NULL,
    `mime` VARCHAR(100) NULL,
    `size` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `documents_patient_id`(`patient_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `before_afters` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `title` VARCHAR(160) NULL,
    `cat` VARCHAR(60) NULL,
    `before` DATE NULL,
    `after` DATE NULL,
    `shade` LONGTEXT NULL,
    `visibility` VARCHAR(20) NULL,
    `consent` BOOLEAN NULL DEFAULT false,
    `crowd` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `generated_docs` (
    `id` VARCHAR(40) NOT NULL,
    `type` VARCHAR(20) NULL,
    `patient_id` VARCHAR(40) NULL,
    `date` DATE NULL,
    `title` VARCHAR(200) NULL,
    `dentist_id` VARCHAR(40) NULL,
    `body` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotes` (
    `id` VARCHAR(40) NOT NULL,
    `number` VARCHAR(30) NULL,
    `patient_id` VARCHAR(40) NULL,
    `dentist_id` VARCHAR(40) NULL,
    `date` DATE NULL,
    `valid` DATE NULL,
    `status` VARCHAR(12) NULL,
    `accepted_at` DATE NULL,
    `signature` VARCHAR(160) NULL,
    `items` LONGTEXT NULL,
    `discount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `conditions` TEXT NULL,
    `plan_id` VARCHAR(40) NULL,
    `sent_at` DATE NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(40) NOT NULL,
    `number` VARCHAR(30) NULL,
    `patient_id` VARCHAR(40) NULL,
    `clinic_id` VARCHAR(40) NULL,
    `dentist_id` VARCHAR(40) NULL,
    `date` DATE NULL,
    `due` DATE NULL,
    `items` LONGTEXT NULL,
    `discount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `appt_id` VARCHAR(40) NULL,
    `plan_id` VARCHAR(40) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `invoices_clinic_id_date`(`clinic_id`, `date`),
    INDEX `invoices_patient_id`(`patient_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(40) NOT NULL,
    `invoice_id` VARCHAR(40) NULL,
    `patient_id` VARCHAR(40) NULL,
    `clinic_id` VARCHAR(40) NULL,
    `date` DATE NULL,
    `amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `method` VARCHAR(20) NULL,
    `kind` VARCHAR(20) NULL,
    `ref` VARCHAR(160) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `payments_clinic_id_date`(`clinic_id`, `date`),
    INDEX `payments_invoice_id`(`invoice_id`),
    INDEX `payments_patient_id`(`patient_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NULL,
    `contact` VARCHAR(120) NULL,
    `phone` VARCHAR(40) NULL,
    `email` VARCHAR(160) NULL,
    `city` VARCHAR(80) NULL,
    `cats` LONGTEXT NULL,
    `delay` INTEGER NULL DEFAULT 3,
    `rating` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(40) NOT NULL,
    `clinic_id` VARCHAR(40) NULL,
    `name` VARCHAR(160) NULL,
    `cat` VARCHAR(60) NULL,
    `qty` INTEGER NULL DEFAULT 0,
    `min` INTEGER NULL DEFAULT 0,
    `unit` VARCHAR(60) NULL,
    `supplier_id` VARCHAR(40) NULL,
    `price` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `lot` VARCHAR(40) NULL,
    `exp` DATE NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` VARCHAR(40) NOT NULL,
    `number` VARCHAR(20) NULL,
    `supplier_id` VARCHAR(40) NULL,
    `clinic_id` VARCHAR(40) NULL,
    `date` DATE NULL,
    `status` VARCHAR(12) NULL,
    `lines` LONGTEXT NULL,
    `expected` DATE NULL,
    `received` DATE NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `labs` (
    `id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NULL,
    `city` VARCHAR(80) NULL,
    `contact` VARCHAR(120) NULL,
    `phone` VARCHAR(40) NULL,
    `email` VARCHAR(160) NULL,
    `delay` INTEGER NULL DEFAULT 7,
    `specialties` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_cases` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `lab_id` VARCHAR(40) NULL,
    `type` VARCHAR(120) NULL,
    `teeth` VARCHAR(60) NULL,
    `shade` VARCHAR(20) NULL,
    `sent` DATE NULL,
    `due` DATE NULL,
    `status` VARCHAR(16) NULL,
    `price` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `received` DATE NULL,
    `dentist_id` VARCHAR(40) NULL,
    `clinic_id` VARCHAR(40) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `dir` VARCHAR(4) NULL,
    `channel` VARCHAR(12) NULL,
    `text` TEXT NULL,
    `at` DATETIME(0) NULL,
    `auto` BOOLEAN NULL DEFAULT false,
    `status` VARCHAR(12) NULL,
    `seen` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `messages_patient_id_at`(`patient_id`, `at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templates` (
    `id` VARCHAR(40) NOT NULL,
    `cat` VARCHAR(60) NULL,
    `name` VARCHAR(120) NULL,
    `text` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_rules` (
    `id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NULL,
    `when` VARCHAR(160) NULL,
    `kind` VARCHAR(20) NULL,
    `offset_minutes` INTEGER NULL DEFAULT 0,
    `channels` LONGTEXT NULL,
    `on` BOOLEAN NULL DEFAULT true,
    `template_id` VARCHAR(40) NULL,
    `sent` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appt_id` VARCHAR(40) NULL,
    `rule_id` VARCHAR(40) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `reminder_logs_appt_id_rule_id`(`appt_id`, `rule_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `followups` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `type` VARCHAR(80) NULL,
    `due` DATE NULL,
    `note` VARCHAR(255) NULL,
    `status` VARCHAR(12) NULL,
    `auto` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `dentist_id` VARCHAR(40) NULL,
    `clinic_id` VARCHAR(40) NULL,
    `date` DATE NULL,
    `rating` INTEGER NULL DEFAULT 5,
    `comment` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `at` DATETIME(0) NULL,
    `user` VARCHAR(160) NULL,
    `user_id` VARCHAR(40) NULL,
    `action` VARCHAR(200) NULL,
    `target` VARCHAR(255) NULL,
    `ip` VARCHAR(64) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `audit_logs_at`(`at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(40) NOT NULL,
    `at` DATETIME(0) NULL,
    `kind` VARCHAR(20) NULL,
    `title` VARCHAR(160) NULL,
    `text` VARCHAR(500) NULL,
    `link` VARCHAR(160) NULL,
    `read` BOOLEAN NULL DEFAULT false,
    `clinic_id` VARCHAR(40) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinic_id` VARCHAR(40) NULL,
    `month` DATE NULL,
    `revenue` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `consults` INTEGER NULL DEFAULT 0,
    `new_patients` INTEGER NULL DEFAULT 0,
    `noshow` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `fill` INTEGER NULL DEFAULT 0,
    `recurrent` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `demo_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `data` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patient_otps` (
    `id` VARCHAR(40) NOT NULL,
    `patient_id` VARCHAR(40) NULL,
    `code_hash` VARCHAR(100) NULL,
    `expires_at` DATETIME(0) NULL,
    `attempts` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `plan_items` ADD CONSTRAINT `plan_items_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

