
import java.util.*;
public class DAQ12{
    public static void main(String[] args){
        Scanner input = new Scanner(System.in);
        int[] Num = {1, 2, 3, 4, 5, 6, 7, 8, 9};
        int[] Rev = new int[Num.length - 1];
        for(int x = 0; x <= Rev.length - 1; x++){
            Rev[x] = Num[x];
        }
        System.out.println("Your Array: " + Arrays.toString(Num));
        System.out.println("Revised Array: " + Arrays.toString(Rev));
    }
}