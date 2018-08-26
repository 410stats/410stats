-- phpMyAdmin SQL Dump
-- version 4.5.4.1deb2ubuntu2
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Dim 26 Août 2018 à 22:44
-- Version du serveur :  5.7.21-log
-- Version de PHP :  7.0.30-0ubuntu0.16.04.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données :  `410stats`
--

-- --------------------------------------------------------

--
-- Structure de la table `connected`
--

CREATE TABLE `connected` (
  `date` datetime NOT NULL,
  `connected` smallint(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `topics`
--

CREATE TABLE `topics` (
  `id` int(11) NOT NULL,
  `titre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `auteur` varchar(40) CHARACTER SET armscii8 COLLATE armscii8_bin DEFAULT NULL,
  `messages` mediumint(9) NOT NULL,
  `dateDerniereAnalyse` datetime DEFAULT NULL,
  `datePremierePage` datetime DEFAULT NULL,
  `dateCreation` datetime DEFAULT NULL,
  `dateSupression` datetime DEFAULT NULL,
  `restaure` smallint(5) UNSIGNED NOT NULL DEFAULT '0',
  `nbPageArchive` smallint(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `connected`
--
ALTER TABLE `connected`
  ADD PRIMARY KEY (`date`);

--
-- Index pour la table `topics`
--
ALTER TABLE `topics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `dateSupression` (`dateSupression`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
