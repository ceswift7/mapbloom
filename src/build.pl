#!/usr/bin/perl
# Perl port of build.ps1 (perl ships with macOS). Rebuilds ../Mapbloom.html from the parts in this folder.
#   perl build.pl --debug     also writes Mapbloom.debug.html with a window.__tw test hook
#   perl build.pl --release   leaves the temporary dev menu (dev.js) out
use strict; use warnings;
use File::Basename qw(dirname); use Cwd qw(abs_path);
my $d = abs_path(dirname(__FILE__)); my $root = dirname($d);
my %a = map { lc($_) => 1 } @ARGV;
my $Debug = $a{'--debug'} || $a{'-debug'}; my $Release = $a{'--release'} || $a{'-release'};

sub part { my $n = shift; open my $f, '<:raw', "$d/$n" or die "$n: $!"; local $/; my $s = <$f>; close $f;
  $s =~ s/^\xEF\xBB\xBF//; return $s; }   # raw UTF-8 bytes, BOM stripped
sub has { -e "$d/$_[0]" }
sub inject { my ($s, $code) = @_; my $t = "\n})();\n</script>"; my $i = index($s, $t);
  return $s if $i < 0; return substr($s, 0, $i) . "\n$code" . substr($s, $i); }
sub write_out { my ($p, $s) = @_; open my $f, '>:raw', $p or die "$p: $!"; print $f $s; close $f; }

my $main = part('main.html');
$main =~ s{/\*\@include (\S+?)\*/\r?\n}{ part($1) }ge;
$main = inject($main, part('glglobe.js')) if has('glglobe.js');
$main = inject($main, part('dev.js')) if !$Release && has('dev.js');

opendir my $dh, $d or die; my @q = sort grep { /^quiz_.*\.js$/i } readdir $dh; closedir $dh;
my $quiz = join "\n", map { part($_) } ('quiz.js', @q);

sub parts { my $m = shift;
  return part('head.html') . part('data.html')
   . "\n<script>\n/* real flag images (flagcdn.com), embedded so the game works offline */\n" . part('flags.js')
   . "\n</script>\n<script>\n/* country reading pages: text adapted from Wikipedia (CC BY-SA 4.0); population etc. from Wikidata (CC0) */\n" . part('learn.js')
   . "\n</script>\n<script>\n/* authored quiz facts */\n" . $quiz . "\n</script>\n" . $m; }

my $out = "$root/Mapbloom.html";
write_out($out, parts($main));
print "built ", -s $out, " bytes", ($Release ? " (release, no dev menu)" : ""), "\n";

if ($Debug) {
  my $dbg = parts(inject($main, part('debug.hook.txt')));
  my $needle = '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3';
  my $raf = "<script>if(/raf=timeout/.test(location.search)){window.requestAnimationFrame=function(cb){return setTimeout(function(){cb(performance.now())},16)}}</script>";
  my $i = index($dbg, $needle);
  substr($dbg, $i, 0, $raf) if $i >= 0;
  write_out("$root/Mapbloom.debug.html", $dbg);
  print "debug build written\n";
}
